package io;

import java.util.HashMap;
import processing.core.PApplet;
import wordcram.*;
import wordstorm.*;

public abstract class Loader {
	
	protected String inPath;
	protected int maxFiles;
	public int numClouds;	
	
	public abstract String getOutput( StormConf conf, int cloudIndex );
	public abstract String getOutputMovie( StormConf conf, int cloudIndex, int frameNum );
	public abstract String getLocalOutput( StormConf conf, int cloudIndex );
	public abstract String getHTMLFolder();
	public abstract String getHTMLOutput(int maxWords);
	public abstract String getStormHTML(StormConf conf);
	public abstract String getStormLog(StormConf conf);
	
	public abstract void loadText(PApplet parent,WordCram w, int index);
	public abstract String getName(int index);
	public abstract String getFolder();
	
	/*
	 * 
	 * Aux methods
	 * 
	 */

	/*
	 * Computes tf idf, but does not set the weight of the word.
	 * Stores them in w.tf and w.idf
	 */
	public void tfIdf(WordCram[] clouds){
		HashMap<String, Integer> idf = new HashMap <String,Integer>();
		for(WordCram c: clouds){
			for(Word w: c.getWords()){
				if(!idf.containsKey(w.word)){
					idf.put(w.word, 1);
				}else {
					Integer val = idf.get(w.word);
					idf.put(w.word, val + 1);
				}
			}
		}
		for(int ii = 0; ii<clouds.length; ++ii){
			Word[] words = docTfIdf(idf,clouds[ii].getWords(), clouds.length);
			clouds[ii].setWords(words);
		}
	}
	public Word[] docTfIdf(HashMap<String,Integer> idf, Word[] words, float D){
		for(Word w: words){
			float num = idf.get(w.word);
			float idfW = (float)(Math.log(D/num)/Math.log(D));
			w.weight *=idfW;
		}
		return new WordSorterAndScaler().sortAndScale(words);
	}
	
	protected static boolean isNumeric(String word) {
		try {
			Double.parseDouble(word);
			return true;
		}
		catch (NumberFormatException x) {
			return false;
		}
	}
	protected String movieNumber(int cont){
		String s = ""+cont;
		while (s.length()<5)
			s= "0"+s;
		return s;
	}
}
