package wordcram;

/*
Copyright 2010 Daniel Bernier

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import java.awt.*;
import java.awt.geom.GeneralPath;
import java.awt.geom.Rectangle2D;
import java.util.*;

import processing.core.*;

class WordCramEngine {

	private PGraphics destination;
	
	private WordFonter fonter;
	private WordSizer sizer;
	private WordColorer colorer;
	private WordAngler angler;
	private WordPlacer placer;
	private WordNudger nudger;
	
	private Word[] words; // just a safe copy
	private EngineWord[] eWords;	
	private int eWordIndex = -1;
	
	private EngineWord[] eUnique;
	private int uniqueIndex = -1;
	
	private RenderOptions renderOptions;
	HashMap<String, ArrayList<String>> overlapped;
	
	WordCramEngine(PGraphics destination, Word[] words, WordFonter fonter, WordSizer sizer,
			WordColorer colorer, WordAngler angler, WordPlacer placer, WordNudger nudger, WordShaper shaper,
			BBTreeBuilder bbTreeBuilder, RenderOptions renderOptions) {
		
		if (destination.getClass().equals(PGraphics2D.class)) {
			throw new Error("WordCram can't work with P2D buffers, sorry - try using JAVA2D.");
		}
		
		this.destination = destination;
		
		this.fonter = fonter;
		this.sizer = sizer;
		this.colorer = colorer;
		this.angler = angler;
		this.placer = placer;
		this.nudger = nudger;
		
		this.renderOptions = renderOptions;
		this.words = words;
		this.eWords = wordsIntoEngineWords(words, shaper, bbTreeBuilder);
		
		this.overlapped = new HashMap<String, ArrayList<String>>();
	}
	
	private EngineWord[] wordsIntoEngineWords(Word[] words, WordShaper wordShaper,
			BBTreeBuilder bbTreeBuilder) {
		
		ArrayList<EngineWord> engineWords = new ArrayList<EngineWord>();
		int maxNumberOfWords = words.length; 

		for (int i = 0; i < maxNumberOfWords; i++) {
			Word w = words[i];
			EngineWord eWord = new EngineWord(w, i, words.length, bbTreeBuilder);
			
			Shape shape =  new WordShaper().getShapeFor(w.word, w.getFont(fonter), w.getSize(sizer,
					w.rank, words.length), w.getAngle(angler), renderOptions.minShapeSize);
			if (shape == null) {
				skipWord(w, WordCram.SHAPE_WAS_TOO_SMALL);
				continue;
				//System.out.println(" Skipped "+ i +" "+w.word+" shape too small "+w.getRenderedSize());
			}
			else {
				eWord.setShape(shape, renderOptions.wordPadding);
				engineWords.add(eWord);  // DON'T add eWords with no shape.
			}
			w.setBounds(shape.getBounds2D(),renderOptions.wordPadding);
		}
		for (int i = maxNumberOfWords; i < words.length; i++) {
			skipWord(words[i], WordCram.WAS_OVER_MAX_NUMBER_OF_WORDS);
		}
		return engineWords.toArray(new EngineWord[0]);
	}
	
	private void skipWord(Word word, int reason) {
		// TODO delete these properties when starting a sketch, in case it's a re-run w/ the same words.
		// NOTE: keep these as properties, because they (will be) deleted when the WordCramEngine re-runs.
		word.wasSkippedBecause(reason);
	}
	
	boolean hasMore() {
		return eWordIndex < eWords.length-1;
	}
	
	void drawAll() {
		//eWordIndex = -1;
		while(hasMore()) {
			drawNext();
		}
	}
	
	void drawNext() {
		if (!hasMore()) return;
		
		EngineWord eWord = eWords[++eWordIndex];

		boolean wasPlaced = placeWord(eWord);
		if (wasPlaced) { // TODO unit test (somehow)
			drawWordImage(eWord);
		}
	}	
	
	HashMap<String,ArrayList<String>> moveAll(){
		overlapped = new HashMap<String,ArrayList<String>>(); 
		while(hasMore()){
			moveNext();
		}
		return overlapped;
	}

	
	void moveNext(){
		EngineWord eWord = eWords[++eWordIndex];
		moveWord(eWord);
	}
	
	boolean placeAll() {
		while(hasMore()){
			boolean wasPlaced = placeNext();
			if(!wasPlaced) return false;
		}
		return true;
	}
	
	boolean placeNext() {		
		EngineWord eWord = eWords[++eWordIndex];
		boolean wasPlaced = placeWord(eWord);
		if(!wasPlaced){
			//System.out.println(" Skipped "+eWord.word.word+" "+eWord.word.cloudIndex + " "+ eWord.word.wasSkippedBecause()+" "+eWord.word.weight);
		}
		return wasPlaced;
	}
		
	void show(Map<String, CoordProp> index, int cloudInd) {
		for(EngineWord eWord: eWords){
			PVector loc = index.get(eWord.word.word).getCurrentLocation(cloudInd);
			eWord.setLocations(loc, loc);
			eWord.finalizeLocation();
			if (eWord.wasPlaced()) {
				drawWordImage(eWord);
				//WordC Details
				//System.out.println(eWord.word.word+" "+eWord.word.getRenderedSize() +" "+loc+" "+eWord.word.getRenderedAngle()+" "+eWord.word.getRenderedColor());
			}
			else{
				//System.out.println("Skipped "+ eWord.getCloudNumber()+ " "+  eWord.word.word);
			}
		}
	}
	
	private void moveWord(EngineWord eWord){
		Word word = eWord.word;
		String w = word.word;
		Rectangle2D rect = eWord.getShape().getBounds2D(); // TODO can we move these into EngineWord.setDesiredLocation? Does that make sense?		
		int wordImageWidth = (int)rect.getWidth();
		int wordImageHeight = (int)rect.getHeight();
		eWord.setDesiredLocation(placer, eWords.length, wordImageWidth, wordImageHeight, destination.width, destination.height);
		eWord.finalizeLocation();
		//Modifies word TargetPlace (to presetTargetPlace or using placer if the former is null), eWord Current and Desired Position
		PVector loc = eWord.getCurrentLocation();
		
		ArrayList<String> over = new ArrayList<String>();
		overlapped.put(w, over);
//		if(loc.x < 0){
//			over.add("_WEST");
//		}
//		if(loc.y < 0){
//			over.add("_NORTH");
//		}
//		if(loc.x + wordImageWidth >= destination.width){
//			over.add("_EAST");
//		}
//		if(loc.y + wordImageHeight >= destination.height) {
//			over.add("_SOUTH");
//		}	
		
		for (int i = 0; i < eWordIndex; i++) {
			EngineWord otherWord = eWords[i];
			if (otherWord.wasSkipped()) continue; //can't overlap with skipped word			
			if (eWord.overlaps(otherWord)) {
				over.add(otherWord.word.word);  
				overlapped.get(otherWord.word.word).add(w);
			}
		}
	}
	
	private boolean placeWord(EngineWord eWord) {
		Word word = eWord.word;
		Rectangle2D rect = eWord.getShape().getBounds2D(); // TODO can we move these into EngineWord.setDesiredLocation? Does that make sense?		
		int wordImageWidth = (int)rect.getWidth();
		int wordImageHeight = (int)rect.getHeight();
		
		eWord.setDesiredLocation(placer, eWords.length, wordImageWidth, wordImageHeight, destination.width, destination.height);
		//Modifies word TargetPlace (to presetTargetPlace or using placer if the former is null), eWord Current and Desired Position
		
		// Set maximum number of placement trials
		int maxAttemptsToPlace = renderOptions.maxAttemptsToPlaceWord > 0 ?
									renderOptions.maxAttemptsToPlaceWord :
									calculateMaxAttemptsFromWordWeight(word);
		
		EngineWord lastCollidedWith = null;
		for (int attempt = 0; attempt < maxAttemptsToPlace; attempt++) {
			
			eWord.nudge(nudger.nudgeFor(word, attempt));
			PVector loc = eWord.getCurrentLocation();
			if (loc.x < 0 || loc.y < 0 || loc.x + wordImageWidth >= destination.width || loc.y + wordImageHeight >= destination.height) {
				continue;
			}
			if (lastCollidedWith != null && eWord.overlaps(lastCollidedWith)) {
				continue;
			}
			boolean foundOverlap = false;
			for (int i = 0; !foundOverlap && i < eWordIndex; i++) {
				EngineWord otherWord = eWords[i];
				if (otherWord.wasSkipped()) continue; //can't overlap with skipped word
				
				if (eWord.overlaps(otherWord)) {
					foundOverlap = true;
					lastCollidedWith = otherWord;
				}
			}			
			if (!foundOverlap) {
				eWord.finalizeLocation();
				return true;
			}
		}
		
		skipWord(eWord.word, WordCram.NO_SPACE);
		return false;
	}

	void placeUnique(Map<String, CoordProp> index, Word[] unique, long rSeed){
		eUnique = wordsIntoEngineWords(unique, new WordShaper(), new BBTreeBuilder(1));
		placer = Placers.centerClump(rSeed);
		nudger = new SpiralWordNudger();
		for(EngineWord eWord: eWords){
			PVector loc = index.get(eWord.word.word).getCurrentLocation(eWord.word.cloudIndex);
			eWord.setLocations(loc, loc);
			eWord.finalizeLocation();
		}
		for(EngineWord eW: eUnique){
			++uniqueIndex;
			if(!placeUniqueWord(eW)) System.err.println(eW.word.word+" unique word not placed");
			index.get(eW.word.word).setCurrentLocation(eW.word.cloudIndex, eW.getCurrentLocation());
		}
	}
	
	private boolean placeUniqueWord(EngineWord eWord) {
		Word word = eWord.word;
		Rectangle2D rect = eWord.getShape().getBounds2D(); // TODO can we move these into EngineWord.setDesiredLocation? Does that make sense?		
		int wordImageWidth = (int)rect.getWidth();
		int wordImageHeight = (int)rect.getHeight();
		
		eWord.setDesiredLocation(placer, eWords.length+eUnique.length, wordImageWidth, wordImageHeight, destination.width, destination.height);
		//Modifies word TargetPlace (to presetTargetPlace or using placer if the former is null), eWord Current and Desired Position
		
		// Set maximum number of placement trials
		int maxAttemptsToPlace = renderOptions.maxAttemptsToPlaceWord > 0 ?
									renderOptions.maxAttemptsToPlaceWord :
									calculateMaxAttemptsFromWordWeight(word);
		
		EngineWord lastCollidedWith = null;
		for (int attempt = 0; attempt < maxAttemptsToPlace; attempt++) {
			
			eWord.nudge(nudger.nudgeFor(word, attempt));
			
			PVector loc = eWord.getCurrentLocation();
//			if (loc.x < 0 || loc.y < 0 || loc.x + wordImageWidth >= destination.width || loc.y + wordImageHeight >= destination.height) {
//				continue;
//			}
			
			if (lastCollidedWith != null && eWord.overlaps(lastCollidedWith)) {
				continue;
			}
			
			boolean foundOverlap = false;
			for(int i = 0; !foundOverlap && i <eWords.length; ++i ){
				EngineWord otherWord = eWords[i];
				//if (otherWord.wasSkipped()) continue; //can't overlap with skipped word
				
				if (eWord.overlaps(otherWord)) {
					foundOverlap = true;
					lastCollidedWith = otherWord;
				}
			}
			for (int i = 0; !foundOverlap && i < uniqueIndex; i++) {
				EngineWord otherWord = eUnique[i];
				//if (otherWord.wasSkipped()) continue; //can't overlap with skipped word
				
				if (eWord.overlaps(otherWord)) {
					foundOverlap = true;
					lastCollidedWith = otherWord;
				}
			}	
			if (!foundOverlap) {
				eWord.finalizeLocation();
				return true;
			}
		}	
		skipWord(eWord.word, WordCram.NO_SPACE);
		return false;
	}
	
	private int calculateMaxAttemptsFromWordWeight(Word word) {
		return (int)((1.0 - word.weight) * 600) + 100;
	}
	
	private void drawWordImage(EngineWord word) {
		GeneralPath path2d = new GeneralPath(word.getShape());
		
		Graphics2D g2 = (Graphics2D)destination.image.getGraphics(); // not sure which is better
		//Graphics2D g2 = ((PGraphicsJava2D)destination).g2;		
		g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		g2.setPaint(new Color(word.word.getColor(colorer), true));
		g2.fill(path2d);
	}
	
	Word getWordAt(float x, float y) {
		for (int i = 0; i < eWords.length; i++) {
			if (eWords[i].wasPlaced()) {
				Shape shape = eWords[i].getShape();
				if (shape.contains(x, y)) {
					return eWords[i].word;
				}
			}
		}
		return null;
	}

	Word[] getSkippedWords() {
		ArrayList<Word> skippedWords = new ArrayList<Word>();
		for (int i = 0; i < words.length; i++) {
			if (words[i].wasSkipped()) {
				skippedWords.add(words[i]);
			}
		}
		return skippedWords.toArray(new Word[0]);
	}
	
	float getProgress() {
		return (float)this.eWordIndex / this.eWords.length;
	}

	EngineWord[] getEWords(){
		return eWords;
	}
	EngineWord[] getEUnique(){
		return eUnique;
	}
	void setPlacer(WordPlacer placer){
		this.placer = placer;
	}
	void setColorer(WordColorer colorer){
		this.colorer = colorer;
	}
	void setAngler(WordAngler angler){
		this.angler = angler;
	}
	
}
