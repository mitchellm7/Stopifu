# Stopifu

Stopifu is a web application which allows domain experts to identify lists of stopwords, hone them for specific tasks, and then visually observe how excluding these words will change the overall makeup of a corpus. In the field of natural language processing, “stopwords” are words that are so frequent that they will often drown out any meaningful patterns to be observed in a collection of text. The practice of removing such words before analysis is common to many natural language processing techniques, including topic modeling. Deciding which words to remove is generally relegated to a “default” stoplist provided with analysis software. However, research has shown that such default lists are often error-ridden, incomplete, or biased towards a particular set of documents. Motivated by the inefficacy of default stoplists, Stopifu takes a collection of documents as input and has the ability to (1) provide default sets of grammar-based stopwords, (2) identify and suggest statistically probable stopwords, (3) toggle activation of stopword sets, and (4) automatically display the impact of excluding the selected stopwords from analysis. To read more about the motivations behind Stopifu, read our research paper (paper_link).

## Installation Guide
We recommend downloading Anaconda Individual Edition, a package manager and Python environment, which facilitates the installation of various libraries required to run Stopifu. Anaconda may be downloaded at https://docs.anaconda.com/anaconda/install/. However, if you prefer not to, you may follow the following instructions using your command prompt.
1. Open the Anaconda prompt, or your command prompt
2. Clone the Stopifu GitHub repository
3. Navigate to the Stopifu directory
4. Install flask, a microframework required to run Stopifu
	If using Anaconda, enter the command, “conda install -c anaconda flask”
	Otherwise, follow the installation instructions at https://flask.palletsprojects.com/en/1.1.x/installation/
5. Install nltk, a toolkit required to run Stopifu
	If using Anaconda, enter the command, “conda install -c anaconda nltk”
	Otherwise, follow the installation instructions at https://www.nltk.org/data.html
6. Place the corpus of documents with which you wish to build a stoplist in a directory on your computer. Documents should be formatted as .txt files and should contain only the text which you wish to analyze (i.e. metainformation like title, authorship, publication should be removed).
Enter the command “python Stopifu.py [directory of your corpus]” in the Anaconda prompt, or your command prompt
Open a web browser and navigate to the IP address the command prompt prints.

## Using Stopifu
![Stopifu UI](https://github.com/mitchellm7/Stopifu/blob/master/static/readmeImage.PNG)
The app consists of five subsections, which work together to build and analyze the stoplist.
The sublist section, at the top left, holds “sublists,” smaller related groups of stopwords which form the final stoplist. Sublists can be used to group stopwords grammatically or by corpus-specific needs. Stopifu automatically includes several grammatical sublists including articles, conjunctions, and contractions. Users can create their own sublists, which are saved for later sessions.
The metric section, at the bottom left, provides potential stopword suggestions, pulled from the currently selected corpus based on several metrics. The metrics are 1) frequency, sorted by highest to lowest, 2) length, sorted lowest to highest, and 3) tf-idf, or “term frequency inverse document frequency,” sorted from highest to lowest, which finds words of high importance to a single document but which appear at low frequencies in the rest of the corpus.
The final stoplist section (the middle column) displays the stopwords which make up the stoplist being created based on the currently-selected sublists and stopwords from the metric section. Final edits can be made in this section.
The corpus section, at the top right, visualizes the effect using the current stoplist on the selected corpus through a number of statistics. It shows the percent of the corpus the stopwords within various sublists make up, the average number of documents each stopword is found within, and the average number of occurrences of each stopword.
The document section, at the bottom right, displays the documents which make up the selected corpus. Users may search through the documents by title and find the impact of the current stoplist on each.