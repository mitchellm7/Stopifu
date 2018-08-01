var stoplistList = [];
var stoplistIndices = {};
var sessionStopwords = [];
var stopwordIndices = {};
var documentSamples = [];

// Returns current date
function getDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    return mm + '-' + dd + '-' + yyyy;
}

// Reveals addStoplistPopup and creates stoplist from input (adds text file and to stoplistList)
function createStoplist() {
    d3.select("#confirmStoplist-btn").on("click", function() {
        var name = d3.select("#createStoplistName").property("value").trim();
        var category = d3.select("#createStoplistCategory").property("value").trim();
        var stopwords = d3.select("#createStoplistWords").property("value").trim().split(" ");
        var date = getDate();
        
        if (name != "" && category != "") {
            var stopURL = '/create_stoplist/' + name + '/' + category + '/' + date;
            d3.json(stopURL, function(foo) { });

            for (var i = 0; i < stopwords.length; i++) {
                var stopURL = '/add_to_stoplist/' + name + '/' + stopwords[i];
                d3.json(stopURL, function(foo) { });
            }
            $('#createStoplistName').val('');
            $('#createStoplistCategory').val('');
            $('#createStoplistWords').val('');
            $('#addStoplistPopup').modal('hide');
            stoplistIndices[name] = stoplistList.length;
            stoplistList.push({
                name: name,
                category: category,
                date: date,
                stopwords: stopwords,
                active: false,
                deleted: false
            });
            updateStoplistVisuals();
        }
    });
    $('#addStoplistPopup').modal('show');
}

// Removes a stopword (from backend and stoplistList)
function removeStopword(name, word) {
    var stopURL = '/remove_from_stoplist/' + name + '/' + word;
    d3.json(stopURL, function(foo) { });
    // Updates stoplist from file
    var stopURL = '/get_stoplist/' + name;
    d3.json(stopURL, function(foo) { 
        stoplistList[stoplistIndices[name]].stopwords = foo['stoplist']['stopwords'];
    });

//    // This uses stoplistList as data instead of backend. (seems to cause issues) 
//    stopwords = stoplistList[stoplistIndices[name]].stopwords;
//    for (i = 0; i < stopwords.length; i++) {
//        if (stopwords[i] == word) {
//            stopwords.splice(i, 1);
//        }
//    }
    
}

// Updates stoplistEdit display to include all stopwords (from stoplist file)
function updateStoplistEditVisuals(name) {
    var stopURL = '/get_stoplist/' + name + '/';
    d3.json(stopURL, function(foo) {
        var stopwordElem = d3.select('#stoplistEditWords').selectAll('.stopword')
            .data(foo['stoplist']['stopwords'], function(d) { return d; });
        
        stopwordElem.enter()
            .append("span")
            .attr("class", "stopword stopword-" + function(d) { return d; })
            .text(function(d) { return d; })
            .on("click", function(d) {
                if (!(d in stopwordIndices)) {
                    stopwordIndices[d] = sessionStopwords.length;
                    sessionStopwords.push({
                        word: d,
                        inclusions: 0,
                        enabled: false
                    });
                    d3.select(this).style("background-color", "darkgray");
                }
                else {
                    if (sessionStopwords[stopwordIndices[d]].enabled) {
                        sessionStopwords[stopwordIndices[d]].enabled = false;
                        d3.select(this).style("background-color", "darkgray");
                    }
                    else {
                        sessionStopwords[stopwordIndices[d]].enabled = true;
                        d3.select(this).style("background-color", "ghostwhite");
                    }
                }
                updateOutputVisuals();
            })
            .each(function(d) {
                if ((d in stopwordIndices) && !sessionStopwords[stopwordIndices[d]].enabled) {
                    d3.select(this).style("background-color", "darkgray");
                }
            })
            .append("button")
            .attr("class", "close stopwordRemove-btn")
            .append("span")
            .html("&times;")
            .on("click", function (d) {
                removeStopword(name, d);
                updateStoplistEditVisuals(name);
            });
        
        stopwordElem.exit().remove();
    });
}

// Updates output section to include active stopwords (from sessionStopwords)
function updateOutputVisuals() {
    var stopwordElem = d3.select('#sub_fullStoplist').selectAll('.stopword')
        .data((sessionStopwords.filter(function(d){ return d.inclusions > 0 && d.enabled === true; })), function(d) {
            return d.word;
        });

    stopwordElem.enter()
        .append("span")
        .attr("class", "stopword stopword-" + function(d) { return d.word; })
        .text(function(d) { return d.word; })
        .append("button")
        .attr("class", "close stopwordRemove-btn")
        .append("span")
        .html("&times;")
        .on("click", function(d) {
            d.enabled = false;
            updateOutputVisuals();
        })

    stopwordElem.exit().remove();
}

// Deletes a stoplist (from stoplist file and stoplistList)
function deleteStoplist(name) {
    if (confirm("Are you certain?")) {
        var stopURL = '/remove_stoplist/' + name;
        d3.json(stopURL, function(foo) {
            d3.select("#stoplist-" + name).remove();
        });
        stoplistList[stoplistIndices[name]].deleted = true;
        delete stoplistIndices[name];
        updateStoplistVisuals();
    }
}

// Reveals and updates the editStoplistPopup to the selected stoplist
function generateStoplistEditDisplay(name) {
    d3.select("#stoplistEditTitle").text(name);
    d3.select("#stoplistEditWords").selectAll("span").remove();
    $('#stoplistEditform').val('');
    d3.select("#stoplistAddBtn").on("click", function() {
        words = d3.select("#stoplistEditform").property("value").split(" ");
        for (var i = 0; i < words.length; i++) {
            // Pushes valid words to stoplistList and stoplist file
            word = words[i].trim();
            if (word != "") {
                var stopURL = '/add_to_stoplist/' + name + '/' + word;
                d3.json(stopURL, function(foo) { });
                stoplistList[stoplistIndices[name]].stopwords.push(word);
            }
        }
        updateStoplistEditVisuals(name);
        $('#stoplistEditform').val('');
    });
    updateStoplistEditVisuals(name);

    
    $('#editStoplistPopup').modal('show');
}

// Toggles the activation of a stoplist, updating sessionStopwords (uses stoplistList as data)
function toggleStoplistActivation(stoplistElem, name) {
    var stoplist = stoplistList[stoplistIndices[name]];
    var stopwords = stoplist.stopwords;
    // Activates, if deactivated
    if (!stoplist.active) {
        // Adds active html
        d3.select(stoplistElem).style("outline", "solid 2px rgba(0,255,0,.8)");
        // Activates stopwords
        for (i = 0; i < stopwords.length; i++) {
            var word = stopwords[i];
            if (!(word in stopwordIndices)) {
                stopwordIndices[word] = sessionStopwords.length;
                sessionStopwords.push({
                    word: word,
                    inclusions: 1,
                    enabled: true
                });
            }
            else {
               sessionStopwords[stopwordIndices[word]].inclusions += 1;
            }
        }
    }
    // Deactivates, if activated
    else {
        // Clear html
        d3.select(stoplistElem).style("outline", "none");
        // Deactivates stopwords
        for (i = 0; i < stopwords.length; i++) {
            sessionStopwords[stopwordIndices[stopwords[i]]].inclusions -= 1;
        }
    }
    stoplist.active = !stoplist.active;
    updateOutputVisuals();
}

// Generates HTML and CSS for a stoplist element (uses only params as data)
function generateStoplistHTML(stoplistElem, name, category, date, stopwords) {
    // Allows hover for stoplist element
    d3.select(stoplistElem)
        .on('mouseover', function() { $(stoplistElem).children(".btn").show(); })
        .on('mouseout', function() { $(stoplistElem).children(".btn").hide(); })
    // Appends stoplistInfoWrapper containing metadata and stopword display
    var stoplistInfoWrapper = d3.select(stoplistElem)
        .append("div")
        .attr("class", "d-flex flex-column stoplistInfoWrapper-" + name)
        .on("click" , function() {
            toggleStoplistActivation(stoplistElem, name);
        })
        .append("div")
            .attr("class", "p-1 stop-metadata")
            .text(function() {
                if (name.length + category.length + date.length > 30) { return name.substring(0, 15) + "..."; } 
                else { return name + "\t / \t" + category + "\t / \t" + date; }
            });
    var stopwordPreview = d3.select(".stoplistInfoWrapper-" + name)
        .append("div")
            .attr("class", "p-1 stopword-preview")
            .text(function() {
                if (stopwords.length > 8) { return stopwords.slice(0, 8).join(", ") + "..."; } 
                else { return stopwords.slice(0, stopwords.length).join(", "); }
            })
    // Appends (hover-only) edit and delete buttons
    var editBtn = d3.select(stoplistElem)
        .append("button")
        .attr("class", "btn stoplistEdit-btn")
        .text("edit")
        .on("click", function() {
            if (stoplistList[stoplistIndices[name]].active) { toggleStoplistActivation(stoplistElem, name); }
            generateStoplistEditDisplay(name);
        })
    var deleteBtn = d3.select(stoplistElem)
        .append("button")
        .attr("class", "btn btn-danger stoplistDelete-btn")
        .text("delete")
        .on("click", function() {
            if (stoplistList[stoplistIndices[name]].active) { toggleStoplistActivation(stoplistElem, name); }
            deleteStoplist(name);
        });
    $(stoplistElem).children(".btn").hide();
}

// Updates HTML elements for stoplists for stoplistList data 
function updateStoplistVisuals() {
    var stoplistElem = d3.select("#stoplists").selectAll('.stoplist')
        .data(stoplistList.filter(function(d){ return d.deleted == false }), function(d) {
            return d.name;
        })
    
    stoplistElem.enter()
        .append("div")
        .attr("class", "stoplist")
        .attr("id", "listwrapper-" + (function(d) {
            return d.name;
        }))
        .each(function(d) {
            generateStoplistHTML(this, d.name, d.category, d.date, d.stopwords);
        });
    
    stoplistElem.exit().remove();
}

// Gets all current stoplists from Stopifu.py, adds each to stoplistList
function addExistingStoplists() {
    var stopURL = '/get_all_stoplists/'
    d3.json(stopURL, function(foo) {
        for (i = 0; i < foo['allStoplists'].length; i++) {
            stoplistIndices[foo['allStoplists'][i]['name']] = stoplistList.length;
            stoplistList.push({
                name: foo['allStoplists'][i]['name'],
                category: foo['allStoplists'][i]['category'],
                date: foo['allStoplists'][i]['date'],
                stopwords: foo['allStoplists'][i]['stopwords'],
                active: false,
                deleted: false
            });
        }
        updateStoplistVisuals();
    });
}

// Generates HTML and CSS for a document element (uses only params as data)
function generateDocumentHTML(documentElem, name, contents) {
    // Appends stoplistInfoWrapper containing metadata and stopword display
    d3.select(documentElem)
        .append("div")
        .attr("class", "d-flex flex-column documentInfoWrapper-" + name)
        .append("div")
            .attr("class", "p-1 stop-metadata")
            .text(function() {
                return name;
            });
    var documentPreview = d3.select(".documentInfoWrapper-" + name)
        .append("div")
            .attr("class", "p-1 stopword-preview")
            .text(function() {
                return contents.substr(0, 50) + "...";
            });
}

// Updates HTML elements for documents
function updateDocumentVisuals() {
    var documentElem = d3.select("#documents").selectAll('.document')
        .data(documentSamples, function(d) {
            return d.name;
        })
    
    documentElem.enter()
        .append("div")
        .attr("class", "document")
        .attr("id", "documentWrapper-" + (function(d) {
            return d.name;
        }))
        .each(function(d) {
            generateDocumentHTML(this, d.name, d.contents);
        });
    
    documentElem.exit().remove();
}

// Gets all current stoplists from Stopifu.py, adds each to stoplistList
function addExistingDocuments() {
    var stopURL = '/get_all_documents/'
    d3.json(stopURL, function(foo) {
        for (i = 0; i < foo['allDocuments'].length; i++) {
            documentSamples.push({
                name: foo['allDocuments'][i]['name'],
                contents: foo['allDocuments'][i]['contents']
            });
        }
        updateDocumentVisuals();
    });
}

// Main function
window.onload = function() {
    addExistingStoplists();
    addExistingDocuments();
    
}
