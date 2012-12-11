The objective of this project is to generate **word storms**, 
multiples of word clouds to afford visual comparison of groups of documents.
Just as a storm is a group of clouds, a word storm is a group of
word clouds. Each cloud in the storm represents a subset of
the corpus. For example, a storm might contain one cloud
per document, or alternatively one cloud to represent all the
documents written in each year, or one cloud to represent
each track of an academic conference, etc. 

![Word Storm](https://github.com/quimcastella/WordStorm/examples/complex.png)

In order to make the clouds easy to compare, 
words that appear in different clouds are placed in similar locations
and more informative words are emphasized.
In this way, similar documents are be represented by visually similar clouds. 

## Create a Word Storm

This project allows you to create word storms from your texts,
giving you options to personalize their apperance, 
so you can create beatiful figures to analyze your documents.

The algorithms to generate the storm are build on top of **WordCram**
([web](http://wordcram.org/), [gitHub](https://github.com/danbernier/WordCram)),
a flexible word cloud generator that creates beautiful clouds using the pupular [Wordle's](http://www.wordle.net/) layout.

### Usage

1. Set the path to the text files using 'io.DataPath.java'.
The project takes the data from 'datapath/input/folder' and returns the storm in
'datapath/output/folder/parameters'
2. Decide the cloud's size in 'AppletConf'.
3. Decide the storm configuration using 'StormConf' (number of files, number of words, colors, angles...)
4. Create a stom!

### Examples

See examples of usage in 'src/wslauncher':

1. 'StormLauncher.java' to create a coordinated word storm.
2. 'IndepLauncher.java' to create independent clouds.
