package io;

import java.io.*;
import java.util.ArrayList;
import java.util.Arrays;

import processing.core.PApplet;

import wordcram.*;
import wordcram.WordCram.TextCase;
import wordstorm.*;

/*
 * Quim Castella
 * 
 * Loads .txt files in the given folder
 * (Omits files starting by "_meta")
 */

public class FileLoaderWeight extends Loader{
	private static String folder;
	public static String[] fileNames;

	public FileLoaderWeight(int maxFiles, String folder){
		FileLoaderWeight.folder = folder;
		this.maxFiles = maxFiles;
		this.inPath = DataPath.dataPath()+"/input/"+folder+"/";
		this.numClouds = loadFiles();
	}
	
	private static String imgName(int cloudIndex){
		String name = fileNames[cloudIndex];
		return name.substring(0, name.lastIndexOf('.'))+".png";
	}
	
	@Override
	public String getOutput( StormConf conf, int cloudIndex ){
		return DataPath.dataPath()+"/output/"+folder+"/"+conf+"/"+imgName(cloudIndex);
	}
	
	@Override
	public String getOutputMovie( StormConf conf, int cloudIndex, int frameNum ){
		String movieName = imgName(cloudIndex);
		movieName = movieName.substring(0, movieName.lastIndexOf('.'))+movieNumber(frameNum)+".png";
		return DataPath.dataPath()+"/output/"+folder+"/"+conf+"/Movie/"+movieName;
	}
	@Override
	public String getLocalOutput( StormConf conf, int cloudIndex ){
		return conf+"/"+imgName(cloudIndex);
	}
	@Override
	public String getHTMLFolder(){
		return DataPath.dataPath()+"/output/"+folder+"/";
	}
	@Override
	public String getFolder(){
		return folder;
	}
	@Override
	public String getHTMLOutput(int maxWords){
		String printMF = maxFiles == -1 || numClouds < maxFiles ? "all" : ""+numClouds;
		return DataPath.dataPath()+"/output/"+folder+"/comp "+printMF+"d.html";
	}
	@Override
	public String getStormHTML(StormConf conf){
		return DataPath.dataPath()+"/output/"+folder+"/"+ conf+".html";
	}
    @Override
    public String getStormSVG(StormConf conf){
        return DataPath.dataPath()+"/output/"+folder+"/"+ conf+"-svg.html";
    }
	@Override
	public String getStormLog(StormConf conf){
		return DataPath.dataPath()+"/output/"+folder+"/"+conf+".txt";
	}
	
	private int loadFiles(){
		FilenameFilter filter = new FilenameFilter() {
		    public boolean accept(File dir, String name) {
		        return name.endsWith(".txt") && !name.startsWith("_meta");
		    }
		};
		File directory = new File(inPath);  
		System.out.println(inPath);
		File[] files = directory.listFiles(filter);
		if(files == null){ 
			System.err.println("No files");
			System.exit(0);
		}
		Arrays.sort(files);
		int numClouds = maxFiles == -1 ? files.length : Math.min(files.length, maxFiles);
		fileNames = new String[numClouds];
		
		System.out.println(numClouds+" files");
		for (int ii = 0; ii < numClouds; ++ii) {
			fileNames[ii] = files[ii].getName();
			//System.out.println(fileNames[ii]);
		}
		return numClouds;
	}
	
	public String getName(int index){
		return fileNames[index];
	}
	
	@Override
	public void loadText(PApplet parent, WordCram w, int index){	
		String source = PApplet.join(parent.loadStrings(inPath+"/"+fileNames[index]), ';');		
		source = w.textCase == TextCase.Lower ? source.toLowerCase()
				: w.textCase == TextCase.Upper ? source.toUpperCase()
			    : source;
		Word [] words = getWeightedWords(source+";");
		words = new WordSorterAndScaler().sortAndScale(words,false);
		w.setWords(words);
	}
	
	public Word[] getWeightedWords(String source){
		ArrayList<Word> words = new ArrayList<Word>();
		while(!source.isEmpty()){
			int nextsemi = source.indexOf(';');
			if (nextsemi == -1 ) break;
			String line = source.substring(0, nextsemi);	
			int nextcoma = line.indexOf(',');
			if (nextcoma == -1 ) break;
			String word = line.substring(0,nextcoma).trim();
			String strWeight = line.substring(nextcoma+1);
			float weight = Float.parseFloat(strWeight);
			words.add(new Word(word,weight));
			source = source.substring(nextsemi+1);		
		}	
		return words.toArray(new Word[0]);
	}
}
