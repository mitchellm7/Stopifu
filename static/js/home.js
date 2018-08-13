var stoplistList = [];
var stoplistIndices = {};
var sessionStopwords = [];
var stopwordIndices = {};
var documentSamples = [];
var freqList = [];
var lengthList = [];
var tfidfList = [];

var test = [];

// Returns current date
function getDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    return mm + '-' + dd + '-' + yyyy;
}

// Appends a word, other params, to sessionStopwords
function addToSessionStopwords(word, inclusions, enabled, metricEnabled = false) {
    stopwordIndices[word] = sessionStopwords.length;
    sessionStopwords.push({
        word: word,
        inclusions: inclusions,
        enabled: enabled,
        metricEnabled: metricEnabled
    });
}

// Downloads full stoplist
function download() {
    filteredList = sessionStopwords.filter(function(d){ return (d.inclusions > 0 || d.metricEnabled) && d.enabled === true; });
    stopwordList = []
    for (i in filteredList) {
        stopwordList.push(filteredList[i]['word']);
    }
    var stopURL = '/download/' + JSON.stringify(stopwordList);
    d3.json(stopURL, function(foo) { });
}

// Reveals addStoplistPopup and creates stoplist from input (adds text file and to stoplistList)
function createStoplist() {
    var name = d3.select("#createStoplistName").property("value").trim();
    var category = d3.select("#createStoplistCategory").property("value").trim();
    var stopwords = d3.select("#createStoplistWords").property("value").trim().split(" ");
    var date = getDate();

    if (name != "" && category != "") {
        var stopURL = '/create_stoplist/' + name + '/' + category + '/' + date;
        d3.json(stopURL, function(foo) {
            for (var i = 0; i < stopwords.length; i++) {
                var stopURL = '/add_to_stoplist/' + name + '/' + stopwords[i];
                d3.json(stopURL, function(foo) { });
                addToSessionStopwords(stopwords[i], 0, true);
            }
        });

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
}

// Removes a stopword (from backend and stoplistList)
function removeStopword(stoplistName, word) {
    var stopURL = '/remove_from_stoplist/' + stoplistName + '/' + word;
    d3.json(stopURL, function(foo) { });
    stopwords = stoplistList[stoplistIndices[stoplistName]].stopwords;
    for (i = 0; i < stopwords.length; i++) {
        if (stopwords[i] == word) { stoplistList[stoplistIndices[stoplistName]].stopwords.splice(i, 1); }
    }
    updateStoplistEditVisuals(stoplistName);
}

// Updates stoplistEdit display to include all stopwords. (from stoplistList)
function updateStoplistEditVisuals(name) {
    var stopwordElem = d3.select('#stoplistEditWords').selectAll('.stopword')
        .data(stoplistList[stoplistIndices[name]].stopwords);

    stopwordElem.enter()
        .append("span")
        .attr("class", function(d) { return "stopword stopword-" + d; })
        .on("click", function(d) {
            e = window.event || e; 
            if(this === e.target) {
                d3.select(this).classed("disabled-stopword", !d3.select(this).classed("disabled-stopword"));
                sessionStopwords[stopwordIndices[d]].enabled = !sessionStopwords[stopwordIndices[d]].enabled;
                sessionStopwords[stopwordIndices[d]].metricEnabled = !sessionStopwords[stopwordIndices[d]].metricEnabled;
            }
        })
    stopwordElem.text(function(d) { return d; })
    stopwordElem.append("button")
        .attr("class", "close stopwordRemove-btn")
        .append("span")
        .html("&times;")
        .on("click", function (d) {
            removeStopword(name, d);
        });
    stopwordElem.classed("disabled-stopword", function(d) {
            if ((d in stopwordIndices) && !sessionStopwords[stopwordIndices[d]].enabled) { return true; }
            else { return false; }
        });

    stopwordElem.exit().remove();
}

// Updates output section to include active stopwords (from sessionStopwords)
function updateOutputVisuals() {
    var activeStopwords = sessionStopwords.filter(function(d){ return (d.inclusions > 0 || d.metricEnabled) && d.enabled === true; })
    var stopwordElem = d3.select('#sub_fullStoplist').selectAll('.stopword')
        .data((activeStopwords), function(d) { return d.word; });

    stopwordElem.enter()
        .append("span")
        .attr("class", function(d) { return "stopword stopword-" + d.word; })
        .text(function(d) { return d.word; })
        .on("mouseover", function(d) { d3.selectAll(".stopword-" + d['word']).classed("hover-highlighted", true); })
        .on("mouseout", function(d) { d3.selectAll(".stopword-" + d['word']).classed("hover-highlighted", false); })
        .append("button")
        .attr("class", "close stopwordRemove-btn")
        .append("span")
        .html("&times;")
        .on("click", function(d) {
            d3.selectAll(".stopword-" + d['word']).classed("hover-highlighted", false);
            d.enabled = false;
            d.metricEnabled = false;
            updateOutputVisuals();
            updateMetricDisplay();
            generateStatisticDisplay();
            updateVisualization();
        });

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
    $("#stoplistEditform").keyup(function(e) { if (e.keyCode === 13 && !e.shiftKey) { $("#stoplistAddBtn").click(); } });

    d3.select("#stoplistAddBtn").on("click", function() {
        words = d3.select("#stoplistEditform").property("value").replace("\n", " ").split(" ");
        for (var i = 0; i < words.length; i++) {
            // Pushes valid words to stoplistList and stoplist file
            word = words[i].trim();
            if (word != "") {
                var stopURL = '/add_to_stoplist/' + name + '/' + word;
                d3.json(stopURL, function(foo) { });
                stoplistList[stoplistIndices[name]].stopwords.push(word);
                addToSessionStopwords(word, 0, true);
            }
        }
        updateStoplistEditVisuals(name);
        $('#stoplistEditform').val('');
    });
    d3.select("#closeEdit-btn").on("click", function() {
        updateStoplistVisuals();
        updateMetricDisplay();
        updateOutputVisuals();
    });
    
    updateStoplistEditVisuals(name);
    
    $('#editStoplistPopup').modal('show');
}

// Toggles the activation of a stoplist, updating sessionStopwords (uses stoplistList as data)
function toggleStoplistActivation(stoplistElem, name) {
    var stoplist = stoplistList[stoplistIndices[name]];
    var stopwords = stoplist.stopwords;
    // Toggles activation
    if (!stoplist.active) {
        d3.select(stoplistElem).classed("stoplist-highlighted", true);
        for (i = 0; i < stopwords.length; i++) { sessionStopwords[stopwordIndices[stopwords[i]]].inclusions += 1; }
    }
    else {
        d3.select(stoplistElem).classed("stoplist-highlighted", false);
        for (i = 0; i < stopwords.length; i++) { sessionStopwords[stopwordIndices[stopwords[i]]].inclusions -= 1; }
    }
    stoplist.active = !stoplist.active;
    updateOutputVisuals();
    updateMetricDisplay();
    generateStatisticDisplay();
    updateVisualization();
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
        .on("click" , function() { toggleStoplistActivation(stoplistElem, name); })
        .append("div")
            .attr("class", "p-1 metadata")
            .text(function() {
                if (name.length + category.length + date.length > 30) { return name.substring(0, 15) + "..."; } 
                else { return name + "\t / \t" + category + "\t / \t" + date; }
            });
    var stopwordPreview = d3.select(".stoplistInfoWrapper-" + name)
        .append("div")
            .attr("class", "p-1 preview")
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
        .data(stoplistList.filter(function(d){ return d.deleted == false }), function(d) { return d.name; })
    
    stoplistElem.enter()
        .append("div")
        .attr("class", function(d) { return "stoplist stoplist-name-" + d.name; })
        .each(function(d) { generateStoplistHTML(this, d.name, d.category, d.date, d.stopwords); });
    stoplistElem.select(".preview")
        .text(function(d) {
                if (d.stopwords.length > 8) { return d.stopwords.slice(0, 8).join(", ") + "..."; } 
                else { return d.stopwords.slice(0, d.stopwords.length).join(", "); }
            })
    
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
            for (j = 0; j < foo['allStoplists'][i]['stopwords'].length; j++) {
                addToSessionStopwords(foo['allStoplists'][i]['stopwords'][j], 0, true);
            }
        }
        updateStoplistVisuals();
    });
}

// Generates HTML and CSS for a document element (uses only params as data)
function generateDocumentHTML(documentElem, name, contents) {
    // Appends stoplistInfoWrapper containing metadata and stopword display
    d3.select(documentElem)
        .append("div")
        .attr("class", "d-flex flex-column documentInfoWrapper-" + name.replace(/[\W_]+/g,"_"))
        .append("div")
            .attr("class", "p-1 metadata")
            .text(function() { return name; });
    var documentPreview = d3.select(".documentInfoWrapper-" + name.replace(/[\W_]+/g,"_"))
        .append("div")
            .attr("class", "p-1 preview")
            .text(function() { return contents.substr(0, 50) + "..."; });
}

// Updates HTML elements for documents
function updateDocumentVisuals(documents) {
    var documentElem = d3.select("#documents").selectAll('.document')
        .data(documents, function(d) { return d.name; })
    
    documentElem.enter()
        .append("div")
        .attr("class", "document")
        .attr("id", function(d) { return "documentWrapper-" + d.name.replace(/[\W_]+/g,"_"); })
        .each(function(d) { generateDocumentHTML(this, d.name, d.contents); });
    
    documentElem.exit().remove();
}

// Queries the document list by title
function queryDocuments() {
    var input = d3.select("#searchBar").property("value").toUpperCase();
    queriedDocList = documentSamples.filter(function(d) {
        return (d['name'].toUpperCase().indexOf(input) > -1);
    })
    updateDocumentVisuals(queriedDocList);
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
        updateDocumentVisuals(documentSamples);
    });
}

// Updates HTML elements for a specified metric list
function updateMetricListVisuals(selector, metricList) {
    var stopwordElem = d3.select("#" + selector).selectAll('.stopword')
        .data(metricList, function(d) { return d['word']; })
    
    stopwordElem.enter()
        .append("li")
        .attr("class", function(d) { return "stopword disabled-stopword stopword-" + d['word']; })
        .text(function(d) {
            if (d['word'].length > 8) { return d['word'].substring(0, 8) + "..."; }
            else { return d['word']; }
        })
        .attr("data-toggle", "tooltip")
        .attr("data-placement", "right")
        .attr("title", function(d) {
            switch(selector) {
                case 'freqList':
                    var sortedCopy = d['docFreqs'].slice().sort(function(a, b){return b-a});
                    var maxDisplay1 = documentNames[d['docFreqs'].indexOf(sortedCopy[0])] + " : " + sortedCopy[0];
                    var maxDisplay2 = documentNames[d['docFreqs'].indexOf(sortedCopy[1])] + " : " + sortedCopy[1];
                    var maxDisplay3 = documentNames[d['docFreqs'].indexOf(sortedCopy[2])] + " : " + sortedCopy[2];
                    tooltip = "Top doc. frequencies of '" + d['word'] + "'<br>1. " + maxDisplay1
                    if (sortedCopy[1] != 0) { tooltip += ("<br>2. " + maxDisplay2) }
                    if (sortedCopy[2] != 0) { tooltip += ("<br>3. " + maxDisplay3) }
                    else { tooltip += "\nRemaining documents have frequencies of 0." }
                    return tooltip;
                    break;
                case 'lengthList':
                    return "'" + d['word'] + "' has a length of " + d['word'].length + "<br>and total frequency of " + d['totalFreq'];
                    break;
                case 'tfidfList':
                    var sortedCopy = d['tfidf'].slice().sort(function(a, b){return b-a});
                    var maxDisplay1 = documentNames[d['tfidf'].indexOf(sortedCopy[0])] + " : " + sortedCopy[0].toExponential(3);
                    var maxDisplay2 = documentNames[d['tfidf'].indexOf(sortedCopy[1])] + " : " + sortedCopy[1].toExponential(3);
                    var maxDisplay3 = documentNames[d['tfidf'].indexOf(sortedCopy[2])] + " : " + sortedCopy[2].toExponential(3);
                    tooltip = "Top doc. TFIDF's of '" + d['word'] + "'<br>1. " + maxDisplay1
                    if (sortedCopy[1] != 0) { tooltip += ("<br>2. " + maxDisplay2) }
                    if (sortedCopy[2] != 0) { tooltip += ("<br>3. " + maxDisplay3) }
                    else { tooltip += "\nRemaining documents have TFIDF's of 0." }
                    return tooltip;
                    break;
            }
        })
        .on("click", function(d) {
            if (!(d['word'] in stopwordIndices)) {
                addToSessionStopwords(d['word'], 0, true, true);
                d3.select(this).classed("disabled-stopword", false);
            }
            else {
                // Toggles metricEnabled and enabled attributes of word, based on current attributes
                var currWord = sessionStopwords[stopwordIndices[d['word']]];
                toggledActivation = !(currWord.metricEnabled || (currWord.enabled && currWord.inclusions > 0));
                
                currWord.metricEnabled = toggledActivation;
                currWord.enabled = toggledActivation;
                d3.select(this).classed("disabled-stopword", !d3.select(this).classed("disabled-stopword"));
            }
            updateOutputVisuals();
            updateMetricDisplay();
            generateStatisticDisplay();
            updateVisualization();
        })
        .on("mouseover", function(d) {
            d3.selectAll(".stopword-" + d['word']).classed("hover-highlighted", true);
//            for (i in stoplistList) {
//                if (stoplistList[i].stopwords.includes(d['word'])) { d3.selectAll(".stoplist-name-" + stoplistList[i]['name']).classed("hover-highlighted", true); }
//            }
        })
        .on("mouseout", function(d) { d3.selectAll(".stopword-" + d['word']).classed("hover-highlighted", false); })
        .append("span")
        .attr("class", "metricStat")
        .text(function(d) {
            if (selector == 'freqList') { return d['totalFreq']; }
            else if (selector == 'lengthList') { return  d['word'].length; }
            else if (selector == 'tfidfList') { return Math.max.apply(Math, d['tfidf']).toExponential(1); }
        });
    
    stopwordElem.classed("disabled-stopword", function(d) {
        var currWord = sessionStopwords[stopwordIndices[d['word']]];
        if ((d['word'] in stopwordIndices) && ((currWord.enabled && currWord.inclusions > 0) || currWord.metricEnabled)) { 
            return false;
        }
        else { return true; }
    })
    
    stopwordElem.exit().remove();
}

// Updates each metric list
function updateMetricDisplay(){
    updateMetricListVisuals("freqList", freqList);
    updateMetricListVisuals("lengthList", lengthList);
    updateMetricListVisuals("tfidfList", tfidfList);
}

// Generates sorted metric lists from tokenStatistics
function generateMetrics() {
    freqList = tokenStatistics.slice().sort(function (a, b) { return b['totalFreq'] - a['totalFreq']; }).slice(0,1000);
    lengthList = tokenStatistics.slice().sort(function (a, b) { return a['word'].length - b['word'].length; }).slice(0,1000);
    tfidfList = tokenStatistics.slice().sort(function (a, b) { return Math.max.apply(Math, b['tfidf']) - Math.max.apply(Math, a['tfidf']); }).slice(0,1000);
    
    updateMetricDisplay();
}

// Generate statistic display
function generateStatisticDisplay() {
    filteredList = sessionStopwords.filter(function(d){ return (d.inclusions > 0 || d.metricEnabled) && d.enabled === true; });
    stopwordList = []
    for (item in filteredList) { stopwordList.push(filteredList[item]['word']); }
    var stopURL = '/get_statistics/' + JSON.stringify(stopwordList);
    d3.json(stopURL, function(foo) {
        d3.select("#stat1").select(".progress")
            .each(function(d) {
                if(d3.select(this).select(".stoplistBar").empty()) {
                    d3.select(this).append("div")
                        .attr("class", "progress-bar stoplistBar")
                        .attr("role", "progressbar")
                        .style("width", function(d) { return foo['stats'][0] + "%" })
                        .attr("aria-valuemin", "0")
                        .attr("aria-valuemax", "100");
                }
                else {
                    d3.select(this).select(".stoplistBar")
                        .style("width", function(d) { return foo['stats'][0] + "%" })
                        .text(function(d) { return foo['stats'][0].substr(0, foo['stats'][0].length - 1) + "%"})
                }
            })
        d3.select("#stat2").select(".progress")
            .each(function(d) {
                if(d3.select(this).select(".stoplistBar").empty()) {
                    d3.select(this).append("div")
                        .attr("class", "progress-bar stoplistBar")
                        .attr("role", "progressbar")
                        .style("width", function(d) { return foo['stats'][2] + "%" })
                        .attr("aria-valuemin", "0")
                        .attr("aria-valuemax", "100");
                }
                else {
                    d3.select(this).select(".stoplistBar")
                        .style("width", function(d) { return foo['stats'][2] + "%" })
                        .text(function(d) { return foo['stats'][2] + "%" })
                }
            })
        d3.select("#stat3")
            .text(foo['stats'][1]);
    });
    
//    <div class="progress-bar" role="progressbar" style="width: 15%" aria-valuenow="15" aria-valuemin="0" aria-valuemax="100"></div>
}

// Gets specs (height, width, margins, x, y) for the visualization
function getVisualizationSpecs() {
    var margin = {top: 20, right: 30, bottom: 50, left: 100},
        width = 350,
        height = 150;

    var x = d3.scale.linear()
        .domain([0, 1])
        .range([0, width]);
    var y = d3.scale.linear()
        .domain([documentNames.length, 0])
        .range([0, height]);
    return [margin, width, height, x, y];
}

// Builds an svg for visualization with axes
function generateVisualization() {
    var formatCount = d3.format(",.0f");
    var specs = getVisualizationSpecs();
    var margin = specs[0], width = specs[1], height = specs[2], x = specs[3], y = specs[4];
    var tickNum = 10;
    if (documentNames.length < 10) { tickNum = documentNames.length; } 
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .tickFormat(function(d) {
            return d*100;
        })
        .orient("bottom");
    var yAxis = d3.svg.axis()
        .scale(y)
        .tickFormat(formatCount)
        .orient("left")
        .ticks(tickNum);

    var svg = d3.select("#sub_vis").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .attr("class", "axis")
        .call(xAxis);
    svg.append("g")
        .attr("transform", "translate(0, 0)")
        .attr("class", "axis")
        .call(yAxis);
    svg.append("text")             
        .attr("transform",
            "translate(" + (width/2) + " ," + (height + margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("% Stopwords");
    
    svg.append("text")
      .attr("transform", "rotate(-90), translate(0, 5)")
      .attr("y", 0 - margin.left/2)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("# of Documents");
    
    updateVisualization()
}

// Updates content of histogram based on sessionStopwords
function updateVisualization() {
    var specs = getVisualizationSpecs();
    var margin = specs[0], width = specs[1], height = specs[2], x = specs[3], y = specs[4];
    
    filteredList = sessionStopwords.filter(function(d){ return (d.inclusions > 0 || d.metricEnabled) && d.enabled === true; });
    stopwordList = []
    for (item in filteredList) { stopwordList.push(filteredList[item]['word']); }
    
    var stopURL = '/get_stopwordFreqs/' + JSON.stringify(stopwordList);
    d3.json(stopURL, function(foo) {
        test = foo['stats'][1];
        var data = d3.layout.histogram()
            .bins(x.ticks(10))
            (foo['stats'][0]);
        var bars = d3.select("svg").selectAll(".bar")
            .data(data)
        bars.enter()
            .append("g")
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + (margin.left + 0.5) + "," + (margin.top - 1.25) + ")"; })
            .each(function() {
                d3.select(this)
                    .append("rect")
                    .attr("fill", "steelblue");
                d3.select(this)
                    .append("text")
                    .attr("text-anchor", "middle")
            });
        
        bars.select("rect")
            .attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y); })
            .attr("width", function(d) { return x(d.dx); })
            .attr("height", function(d) { return height - y(d.y); })
            .on("click", function(d) {
                currDocs = []
                for (i = 0; i < d.y; i++) {
                    value = d[i]
                    filteredList = Object.keys(foo['stats'][1]).filter(function(key){ return foo['stats'][1][key] == value; });
                    currDocs.push(filteredList);
                }
                alert(currDocs);
            });
        
        bars.select("text")
            .attr("dy", "14px")
            .attr("dx", function(d) { return x(d.dx) / 2; })
            .attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y); })
            .text(function(d) { 
                if (d.y > 0) { return d.y; } 
                else { return ""} 
            });
        
        bars.exit().remove();
    });
}

// Main function
window.onload = function() {
    addExistingStoplists();
    addExistingDocuments();
    generateMetrics();
    generateStatisticDisplay();
    generateVisualization();
    
    $(document).ready(function(){
        $('[data-toggle="tooltip"]').tooltip({delay: {show: 500, hide: 100}, animation: true, html: true}); 
    });
}
