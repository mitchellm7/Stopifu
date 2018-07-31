import os
from datetime import date
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Returns names of all stoplist files in stoplist directory
def getStoplistNames():
    stoplistNames = []
    for item in os.listdir('stoplists/'):
        stoplistNames.append(item.strip(".txt"))
    return stoplistNames

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
            stoplist['name'] = metadata[0]
            stoplist['category'] = metadata[1]
            stoplist['date'] = metadata[2]
        if jsonifyCheck:
            return jsonify({ 'stoplist':stoplist })
        else:
            return stoplist
    else:
        return "No such file exists."

# Gets all stoplist
@app.route('/get_all_stoplists/')
def getAllStoplists():
    allStoplists = []
    stoplistNames = getStoplistNames()
    for stoplistName in stoplistNames:
        allStoplists.append(getStoplist(stoplistName, False))
    return jsonify({  'allStoplists':allStoplists })
    
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
            file.close();
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

# Returns names of all active documents
def getDocumentNames(path):
    docs = []
    for item in os.listdir(path):
        docs.append(item.strip(".txt"))
    return docs

# Gets jsonified document information (Repurposed from Kipp's Stopify)
@app.route('/get_document/<name>')
def getDocument(path, name):
    contents = []
    if os.path.isfile(path + name + ".txt"):
        with open(path + name + ".txt", "r+") as file:
            for line in file:
                contents.append(line.strip())
        contents = ''.join(contents)
        return jsonify({ 'contents':contents })
    else:
        return "No such file exists."

# Render index.html
@app.route('/')
def home():
    return render_template('index.html',
                            documentNames = getDocumentNames("doc/"),
                            stoplistNames = getStoplistNames())
    
if __name__ == '__main__':
    app.run(debug = True)