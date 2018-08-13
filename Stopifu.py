import os
from flask import Flask, render_template, jsonify, request
import json
# punkt required.. in command prompt -> python -> import nltk -> nltk.download() -> go to models tab, download punkt
from TDMmaker import make_term_document_matrix, getTokenFreq
import math
import csv

app = Flask(__name__)
tdm = []
termIndices = {}
tokenFreq = []

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
    documentNames = getDocumentNames("docTestDir/")
    for documentName in documentNames:
        allDocuments.append(getDocumentSample("docTestDir/", documentName, False))
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
    tokenFreq = getTokenFreq("docTestDir/")
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
    stoplistFreqs = []
    totalDocFreq = 0
    for word in fullList:
        if word in termIndices:
            stopwordTokenSum += tdm[termIndices[word]]['totalFreq']
            stoplistFreqs.append(tdm[termIndices[word]]['totalFreq'])
            for doc in tdm[termIndices[word]]['docFreqs']:
                if doc > 0:
                    totalDocFreq +=1            
            
    stats[0] = str( round(stopwordTokenSum / float(tokensBefore), 5) * 100)
    if len(stoplistFreqs) == 0:
        stats[1] = str(0)
        stats[2] = str(0)
    else:
        stats[1] = str(round((float(sum(stoplistFreqs)) / len(fullList)), 2))
        stats[2] = str(round((float(totalDocFreq) / len(fullList))/len(tokenFreq), 3) * 100)
    
    
    return jsonify({ 'stats' : stats})


@app.route('/get_stopwordFreqs/<fullList>')
def getStopwordFreqs(fullList):
    fullList = json.loads(fullList)
    documentNames = getDocumentNames("docTestDir/")
    
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
                            documentNames = getDocumentNames("docTestDir/"),
                            stoplistNames = getStoplistNames(),
                            tokenStatistics = tdm)
    
if __name__ == '__main__':
    tdm, termIndices, tokenFreq = getMetrics("docTestDir/", True)
    
#    tdm = getMetrics("docTestDir/")
#    with open('test1.csv', 'wb+') as stats:
#        firstRow = ['term', 'total freq', 'doc freqs', '', '', '', '', 'tdidfs']
#        csvWriter = csv.writer(stats, delimiter=",")
#        csvWriter.writerow(firstRow)
#        for word in tdm:
#            csvWriter.writerow([word['word']] + [word['totalFreq']] + word['docFreqs'] + word['tfidf'])
    
    app.run(debug = True)