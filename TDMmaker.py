import sys
import os
import string
import nltk
import glob

# Tokenizes a single document
# -Parameters: .txt filename
# TODO: think about the leaving the case of the words alone
# -Returns: lowercase, punctuation-free, list of tokens
def get_tokens(filename):
    with open(filename, 'r') as document:
        text = document.read()
        lowers = text.lower()
        # For python2.7 replace following line with: no_punctuation = lowers.translate(None, string.punctuation)
        no_punctuation = lowers.translate(str.maketrans('','',string.punctuation))
        tokens = nltk.word_tokenize(no_punctuation)
        return tokens

# Converts a corpus into a Term Document Matrix
# -Parameters: path to corpus directory
# -Returns: Dictionary where keys map tokens to document occurances
def make_term_document_matrix(path):
    tdm = []
    termIndices = {}
    cur_number = 0
    termIterator = 0
    # Creates list of all filenames in directory ending in '.txt'
    docs = glob.glob(path + '*.txt')


    for filename in docs:
        cur_doc = get_tokens(filename)
        for item in cur_doc:
            if item in termIndices:
                #TODO: Make sure that this is going in order
                # For example, doc3 is the first opened but gets but in doc0 place in matrix
                tdm[termIndices[item]]['docFreqs'][cur_number] += 1
                tdm[termIndices[item]]['totalFreq'] += 1
            else:
                termIndices[item] = termIterator
                item_dict = {}
                item_dict['word'] = item
                # Creates frequency list for each document
                item_dict['docFreqs'] = [0 for i in range(len(docs))]
                item_dict['totalFreq'] = 1
                # Increments frequency of specific document
                item_dict['docFreqs'][cur_number] += 1
                
                tdm.append(item_dict)
                
                termIterator += 1
        cur_number += 1
    return tdm, termIndices

def getTokenFreq(path):
    tokenFreq = []
    docs = glob.glob(path + '*.txt')
    
    for filename in docs:
        tokenFreq.append(len(get_tokens(filename)))
        
    return tokenFreq