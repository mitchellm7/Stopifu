import os
from flask import Flask, render_template, jsonify, request
import json
# punkt required.. in command prompt -> python -> import nltk -> nltk.download() -> go to models tab, download punkt
from TDMmaker import make_term_document_matrix, getTokenFreq
import math
import csv
import sys

app = Flask(__name__)
tdm = []
termIndices = {}
tokenFreq = []
docDir = ""

# Creates an output file from list of stopwords parameter
@app.route('/download/<fullList>')
def download(fullList):
    fullList = json.loads(fullList)
    
    downloadPath = 'output/stoplist.txt'
    uniq = 1
    while os.path.exists(downloadPath):
        downloadPath = 'output/stoplist_%s.txt' % (uniq)
        uniq += 1
        
    with open(downloadPath, "wb") as file:
        file.write(" ".join(fullList))
    return jsonify({})

# Creates a new stoplist (if valid name)
@app.route('/create_stoplist/<name>/<category>/<date>')
def createStoplist(name, category, date):
    if not os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "w") as file:
            file.write(name + "\t" + category + "\t" + date + "\n")
        return jsonify({})
    else:
        return "A stoplist with this name already exists"

    
# Removes a stoplist
@app.route('/remove_stoplist/<name>')
def removeStoplist(name):
    if os.path.isfile("stoplists/" + name + ".txt"):
        os.remove("stoplists/" + name + ".txt")
        return jsonify({})
    else: 
        return "No such file exists."

# Adds a word to a stoplist file (repurposed from Kipp's Stopify)
@app.route('/add_to_stoplist/<name>/<word>')
def addToStoplist(name, word):
    if os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "a+") as file:
            file.write("%s\n" % word)
        return jsonify({})
    else:
        return "No such file exists."
        
# TODO Make finding word easier (try to include what position a word is in stoplist in its object)
# Removes a word from a stoplist file
@app.route('/remove_from_stoplist/<name>/<word>')
def removeFromStoplist(name, word):
    if os.path.isfile("stoplists/" + name + ".txt"):
        # Copies every line from stoplist file, except word-to-remove
        stoplist = []
        with open("stoplists/" + name + ".txt", 'r') as file:
            for line in file:
                if not (line.strip() == word):
                    stoplist.append(line.strip() + "\n")
        # Replaces stoplist file with copy
        with open("stoplists/" + name + ".txt", 'w') as file:
            file.writelines(stoplist)
        return jsonify({})
    else:
        return "No such file exists."
    
# Gets stoplist information
@app.route('/get_stoplist/<name>/')
def getStoplist(name, jsonifyCheck = True):
    stoplist = {}
    stopwords = []
    stoplist['stopwords'] = stopwords
    if os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "r+") as file:
            metadata = file.readline().split("\t")
            for line in file:
                stoplist['stopwords'].append(line.strip())
            stoplist['name'] = metadata[0].strip()
            stoplist['category'] = metadata[1].strip()
            stoplist['date'] = metadata[2].strip()
        if jsonifyCheck:
            return jsonify({ 'stoplist':stoplist })
        else:
            return stoplist
    else:
        return "No such file exists - " + name + "."

# Gets all stoplist
@app.route('/get_all_stoplists/')
def getAllStoplists():
    allStoplists = []
    stoplistNames = getStoplistNames()
    for stoplistName in stoplistNames:
        allStoplists.append(getStoplist(stoplistName, False))
    return jsonify({  'allStoplists':allStoplists })

# Gets jsonified document information (Repurposed from Kipp's Stopify)
@app.route('/get_document_sample/<name>')
def getDocumentSample(path, name, jsonifyCheck = True):
    document = {}
    document['name'] = name
    contents = []
    if os.path.isfile(path + name + ".txt"):
        with open(path + name + ".txt", "r+") as file:
            for line in file:
                contents.append(line.strip())
                if len(contents) > 49:
                    break
        document['contents'] = ''.join(contents)
        if jsonifyCheck:
            return jsonify({ 'contents':contents })
        else:
            return document
    else:
        return "No such file exists."

# Gets all documents
@app.route('/get_all_documents/')
def getAllDocuments():
    allDocuments = []
    documentNames = getDocumentNames(docDir)
    for documentName in documentNames:
        allDocuments.append(getDocumentSample(docDir, documentName, False))
    return jsonify({  'allDocuments':allDocuments })
    
# Returns names of all stoplist files in stoplist directory
def getStoplistNames():
    stoplistNames = []
    for item in os.listdir('stoplists/'):
        stoplistNames.append(item[:-4])
    return stoplistNames
    
# Returns names of all active documents
def getDocumentNames(path):
    docs = []
    for item in os.listdir(path):
        docs.append(item[:-4])
    return docs


# Adds lists of TFIDFs for each document for each term to a tdm
def addTFIDF(tdm, tokenFreq, numDocs):    
    for word in tdm:
        word['tfidf'] = []
        docFreq = 0
        
        for i in range(numDocs):
            if word['docFreqs'][i] > 0:
                docFreq += 1
        
        for i in range(numDocs):
            tf = float(word['docFreqs'][i]) / tokenFreq[i]
            idf = math.log(float(numDocs) / docFreq)
            word['tfidf'].append(tf * idf)
            
# Returns statistics of terms (full TDM, frequency, TFIDF)
def getMetrics(path, wIndices = False):
    # Get # of docs and token frequency list for docs
    numDocs = len(getDocumentNames(path))
    tokenFreq = getTokenFreq(docDir)
    # Create term document matrix, add TFIDF for each token
    tdm, termIndices = make_term_document_matrix(path)
    addTFIDF(tdm, tokenFreq, numDocs)
    if wIndices: 
        return tdm, termIndices, tokenFreq
    else:
        return tdm

# Returns statistics on the corpus impact of a stoplist
@app.route('/get_statistics/<fullList>')
def getStatistics(fullList):
    fullList = json.loads(fullList)
    
    stats = [0, 0, 0]
    
    tokensBefore = sum(tokenFreq)
    stopwordTokenSum = 0
    stopwordFreqs = []
    totalDocFreq = 0
    stoplistFreqs = [0, 0]
    stoplistDocFreqs = [[0] * len(tokenFreq), [0] * len(tokenFreq)]
    stoplistIndices = {}
    stoplistIndices['metrics'] = 0
    stoplistIndices['overlap'] = 1
    
    for word in fullList:
        if word['word'] in termIndices:
            stopwordTokenSum += tdm[termIndices[word['word']]]['totalFreq']
            stopwordFreqs.append(tdm[termIndices[word['word']]]['totalFreq'])
#                
            for doc in tdm[termIndices[word['word']]]['docFreqs']:
                if doc > 0:
                    totalDocFreq += 1
            
            if word['appearances'] and len(word['appearances']) == 1:
                stoplist = str(word['appearances'][0])
                if stoplist in stoplistIndices:
                    stoplistFreqs[stoplistIndices[stoplist]] += tdm[termIndices[word['word']]]['totalFreq']
                    for i in range(len(tdm[termIndices[word['word']]]['docFreqs'])):
                        stoplistDocFreqs[stoplistIndices[stoplist]][i] += tdm[termIndices[word['word']]]['docFreqs'][i]
                else:
                    stoplistIndices[stoplist] = len(stoplistFreqs)
                    stoplistFreqs.append(tdm[termIndices[word['word']]]['totalFreq'])
                    stoplistDocFreqs.append([])
                    for docFreq in tdm[termIndices[word['word']]]['docFreqs']:
                        stoplistDocFreqs[stoplistIndices[stoplist]].append(docFreq)
            elif word['appearances'] and len(word['appearances']) > 1:
                stoplistFreqs[stoplistIndices['overlap']] += tdm[termIndices[word['word']]]['totalFreq']
                for i in range(len(tdm[termIndices[word['word']]]['docFreqs'])):
                    stoplistDocFreqs[stoplistIndices['overlap']][i] += tdm[termIndices[word['word']]]['docFreqs'][i]
            else:
                stoplistFreqs[stoplistIndices['metrics']] += tdm[termIndices[word['word']]]['totalFreq']
                for i in range(len(tdm[termIndices[word['word']]]['docFreqs'])):
                    stoplistDocFreqs[stoplistIndices['metrics']][i] += tdm[termIndices[word['word']]]['docFreqs'][i]       
    print(tokensBefore)            
    stats[0] = str( round(stopwordTokenSum / float(tokensBefore), 5) * 100)
    if len(stopwordFreqs) == 0:
        stats[1] = str(0)
        stats[2] = str(0)
    else:
        stats[1] = str(round((float(sum(stopwordFreqs)) / len(fullList)), 2))
        stats[2] = str(round((float(totalDocFreq) / len(fullList))/len(tokenFreq), 3) * 100)
        
    for i in range(len(stoplistFreqs)):
        stoplistFreqs[i] = str( round(stoplistFreqs[i] / float(tokensBefore), 5) * 100)
        for j in range(len(stoplistDocFreqs[i])):
            print(tokenFreq[j])
            stoplistDocFreqs[i][j] = str(round(stoplistDocFreqs[i][j] / float(tokenFreq[j]), 5) *  100)
    
    stats.append(stoplistFreqs)
    stats.append(stoplistDocFreqs)
    stats.append(stoplistIndices)
    return jsonify({ 'stats' : stats})


@app.route('/get_stopwordFreqs/<fullList>')
def getStopwordFreqs(fullList):
    fullList = json.loads(fullList)
    documentNames = getDocumentNames(docDir)
    
    numDocs = len(tokenFreq)
    stopwordFreqDict = {}
    stopwordFreqs = [0] * numDocs
    
    for word in fullList:
        if word in termIndices:
            for i in range(numDocs):
                stopwordFreqs[i] += tdm[termIndices[word]]['docFreqs'][i]
            
    for i in range(numDocs):
        stopwordFreqs[i] = round(float(stopwordFreqs[i]) / tokenFreq[i], 5)
        stopwordFreqDict[documentNames[i]] = stopwordFreqs[i]
        
    
    return jsonify({ 'stats' : [stopwordFreqs, stopwordFreqDict] })
    
# Render index.html
@app.route('/')
def home():
    return render_template('index.html',
                            documentNames = getDocumentNames(docDir),
                            stoplistNames = getStoplistNames(),
                            tokenStatistics = tdm)
    
if __name__ == '__main__':
    docDir = sys.argv[1]
    #if docDir[-1] != "\\":
    #    docDir = docDir + "\\"
        
    print(docDir)

    if os.path.isdir(docDir):
        tdm, termIndices, tokenFreq = getMetrics(docDir, True)
        
        if len(sys.argv) == 2:
            app.run(debug = True)
        else:
            host = sys.argv[2]
            port = int(sys.argv[3])
            app.run(host=host, port=port, debug=True)
    else: 
        print("Invalid directory path.")
    
#    tdm = getMetrics("docTestDir/")
#    with open('test1.csv', 'wb+') as stats:
#        firstRow = ['term', 'total freq', 'doc freqs', '', '', '', '', 'tdidfs']
#        csvWriter = csv.writer(stats, delimiter=",")
#        csvWriter.writerow(firstRow)
#        for word in tdm:
#            csvWriter.writerow([word['word']] + [word['totalFreq']] + word['docFreqs'] + word['tfidf'])
