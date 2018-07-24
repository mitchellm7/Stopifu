import os
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

@app.route('/')
def stopifu():
    name = getDocumentList("doc/")
    return render_template('index.html', name=name)

@app.route('/get_stoplist/<name>')
def getStoplist(name):
    stoplist = {}
    stopwords = []
    stoplist['stopwords'] = stopwords
    if os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "r+") as file:
            metadata = file.readline().split()
            stopwords = file.readline().split()
            stoplist['name'] = metadata[0]
            stoplist['category'] = metadata[1]
            stoplist['date'] = metadata[2]
            for word in stopwords:
                stoplist['stopwords'].append(word)
        return stoplist
    else:
        return "No such file exists."
    
@app.route('/add_stoplist')
def addStoplist(name, category, date, stopwords):
    if not os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "w+") as file:
            file.write(name + " " + category + " " + date + "\n")
            file.write(" ".join(stopwords))
            file.close()
        return jsonify({})
    else:
        return "A stoplist with this name already exists"

#  (Repurposed from Kipp's Stopify)
@app.route('/add_to_stoplist/<name>/<word>')
def addToStoplist(name, word):
    if os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "a+") as file:
            file.write("\n%s" % word)
            file.close();
        return jsonify({})
    else:
        return "No such file exists."
        
# TODO Find way to replace text without writing new file. This doens't work. (Repurposed from Kipp's Stopify)
@app.route('/remove_from_stoplist/<name>/<word>')
def removeFromStoplist(name, word):
    if os.path.isfile("stoplists/" + name + ".txt"):
        with open("stoplists/" + name + ".txt", "r+") as file:
            firstLine = True
            for line in file:
                if firstLine:
                    firstLine = False
                else:
                    if word in line:
                        line.replace(word, "")
                        return line
            file.close();
        return jsonify({})
    else:
        return "No such file exists."
    
# Returns active documents
@app.route('/get_document_list')
def getDocumentList(path):
    docs = []
    for item in os.listdir(path):
        docs.append(item)
    return docs

# Return the contents of a document (Repurposed from Kipp's Stopify)
@app.route('/get_document/<name>')
def getDocument(path, name):
    contents = []
    if os.path.isfile(path + name + ".txt"):
        with open(path + name + ".txt", "r+") as file:
            for line in file:
                contents.append(line.strip())
        contents = ''.join(contents)
        return contents
    else:
        return "No such file exists."

if __name__ == '__main__':
    app.run()