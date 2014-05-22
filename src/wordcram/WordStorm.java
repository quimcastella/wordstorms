package wordcram;

import io.*;
import java.awt.*;
import java.util.*;
import processing.core.PApplet;
import processing.core.PVector;
import wordstorm.StormConf;

/*
 * Quim Castella
 * 
 * Array of WordCrams and word index with the coordinated 
 * properties. 
 * 
 */

public class WordStorm {
	private PApplet grandpa;
	WordCram[] clouds;
	public int numClouds;
	private int tol;
	private int maxWords;
	
	Coordinated coor;
	Map<String, CoordProp> index;
	ArrayList<HashMap<String, ArrayList<String>>> overlapped;
	
	public WordStorm(PApplet g){
		this.grandpa = g;
	}

	public void loadText(StormConf conf, Loader load){
		this.numClouds = load.numClouds;
		clouds = new WordCram[numClouds];
		for (int ii = 0; ii < numClouds; ++ii) {
			clouds[ii] = new WordCram(grandpa);
			if(conf.getTextCase() == 0 ) clouds[ii].lowerCase();
			else if(conf.getTextCase() == 1 )clouds[ii].upperCase(); //text options
	
			load.loadText(grandpa, clouds[ii], ii);
		}
		if(conf.getTfIdf() == 1){
			load.tfIdf(clouds);
		}
	}
	
	/*
	 * Words are divided in unique and shared.
	 */
	public void separateUnique() {
		for(WordCram cloud : clouds) {
			Word[] all = cloud.getWords();
			ArrayList<Word> shared = new ArrayList<Word>();
			ArrayList<Word> unique = new ArrayList<Word>();
			for(Word w: all) {
				if(index.get(w.word).getNumClouds()>1)	shared.add(w);
				else{
					w.weight = w.origWeight; // the size of the unique words is not optimized
					unique.add(w);
				}
			}
		    Word[] sharedArr = new Word[shared.size()];
		    sharedArr = shared.toArray(sharedArr);
			cloud.setWords(sharedArr);
		    Word[] uniqueArr = new Word[unique.size()];
		    uniqueArr = unique.toArray(uniqueArr);
			cloud.setUniqueWords(uniqueArr);
		}
	}
	
	public void mergeWords(){
		for(WordCram cloud : clouds) {
			Word[] shared = cloud.getWords();
			Word[] unique = cloud.getUniqueWords();
			Word[] all = new Word[shared.length + unique.length]; 
			System.arraycopy(shared, 0, all, 0, shared.length);
			System.arraycopy(unique, 0, all, shared.length, unique.length);
			cloud.setWords(all);
			cloud.setUniqueWords(new Word[0]);
		}
	}
	
	public void cloudSettings(StormConf conf, Loader load){
		this.tol = conf.getTol();
		this.maxWords = conf.getMaxWords();
		for (int ii = 0; ii < numClouds; ++ii) {
			clouds[ii]
				.withAlgorithm(conf.getCoorPlacer())
				.withFont("ChunkFive")
				.withColorer(Colorers.Random(grandpa))
				.withWordPadding(1) // Increases the word rectangle to let spaces among words
				.maxNumberOfWordsToDraw(maxWords)
				.withPlacer(Placers.centerClump(conf.getrSeed()+ii))
				.withAngler(Anglers.mostlyHoriz(conf.getrSeed()+ii))
				.withNudger(new SpiralWordNudger())
				.maxAttemptsToPlaceWord(5000)
				.sizedByWeight(8, 65)
				;
//				clouds[ii].sizedByWeight(12, 65); // Control the size of the words manually
			clouds[ii].setConfiguration(ii, conf.getrSeed(), conf.getScale(), (conf.getCoorPlacer() == 3));
		}
	}
	
	public void createIndex(){
		index = new HashMap<String, CoordProp>();
		for (int ii = 0; ii < numClouds; ++ii) {
			Word[] words = clouds[ii].getWords();
			for(Word w: words){
				CoordProp prop = index.get(w.word);
				if (prop == null) {
					prop = new CoordProp();
				    index.put(w.word, prop);
				}
				prop.addWordCloud(ii, w);
			}
		}
	}
	
	public void cloudIdf(){
		float maxIdf = (float) Math.log(numClouds);
		for(String word: index.keySet()){
			float numDw = index.get(word).getNumClouds();
			index.get(word).setIdf((float) (Math.log(numClouds/numDw))/maxIdf);	
		}
	}
	
	public void startCoordination(MDS mds, long rSeed, int tfIdf){
		coor = new Coordinated(index, mds, overlapped, rSeed, tfIdf);
	}
	
	public void coordinatedPlacer(){
		for (int ii = 0; ii < numClouds; ++ii) {
			clouds[ii].withPlacer(coor.averageCenter());
		}
	}
	public void mdsGradient(){
		for (int ii = 0; ii < numClouds; ++ii) {
			clouds[ii].withPlacer(coor.mdsGradient());
		}
	}
	public void coordinatedColorer(){
		for (int ii = 0; ii < numClouds; ++ii) {
			clouds[ii].withColorer(coor.sameColor(grandpa));
		}
	}
	public void coordinatedAngler(){
		for (int ii = 0; ii < numClouds; ++ii) {
			clouds[ii].withAngler(coor.sameAngle());
		}
	}
	
	public void setZeroOverlap(){
		overlapped = new ArrayList<HashMap<String,ArrayList<String>>>();
		for(WordCram cloud: clouds){
			HashMap<String,ArrayList<String>> over = new HashMap<String,ArrayList<String>>();
			Word[] words = cloud.getWords();
			for(Word w : words){
				over.put(w.word, new ArrayList<String>());
			}
			overlapped.add(over);
		}
		coor.setOverlapped(overlapped);
	}
	
	public void setAlgorithm(int a){
		for(WordCram cloud: clouds){
			cloud.setAlgorithm(a);
		}
	}
	
	public void printWordIndex(){
		for(String w: index.keySet()){
			CoordProp prop = index.get(w);
			System.out.println(w+" -> "+prop.toString());
		}
		System.out.println();
	}
	
	public void moveWords(boolean verbose){
		overlapped = new ArrayList<HashMap<String,ArrayList<String>>>();
		for(int ii=0; ii<numClouds; ++ii){
			if(verbose && numClouds>50 && ii%50 == 0) System.out.print(" "+ii);
			HashMap<String, ArrayList<String>> over = clouds[ii].moveAll();
			overlapped.add(over);
			updateIndex(ii);
			clouds[ii].forgetEngine();
		}
		coor.setOverlapped(overlapped);
		if(verbose && numClouds >= 50) System.out.println();
	}
	
	public void placeWords(boolean printIndex, boolean verbose){
		for(int ii=0; ii<numClouds; ++ii){
			if(verbose && numClouds>50 && ii%50 == 0) System.out.print(" "+ii);
			boolean succesful = clouds[ii].placeAll();
			if( !succesful ){
				clouds[ii].forgetEngine();
				for(int jj=0; jj<numClouds; ++jj){
					clouds[jj].reduceWordSize(0.9f);
				}
				ii=-1;
//				System.out.println("reducing words' size");
				continue;
			}
			else{
				updateIndex(ii); 
				clouds[ii].forgetEngine();
			}
		}
		if(verbose && numClouds>= 50 ) System.out.println();
	//	System.err.println(index.size());
		if(printIndex) printWordIndex();
	}
	
	public void placeUnique(long rSeed){
		for(WordCram cloud : clouds){
			cloud.setAlgorithm(1);
			Word[] unique = cloud.getUniqueWords();
			cloud.placeUnique(index, unique, rSeed);
			cloud.forgetEngine();
		}
		mergeWords();
	}
	
	public void updateIndex(int cloudInd){
		EngineWord[] eWords = clouds[cloudInd].getWordCramEngine().getEWords();
		for(EngineWord eWord: eWords){
			index.get(eWord.word.word).setCurrentLocation(cloudInd, eWord.getCurrentLocation());
		}
	}
	
	public int nConverged(){
		int converged = 0;
		for(String w: index.keySet()){
			CoordProp prop = index.get(w);
			PVector average = prop.getAverage();
			ArrayList<Integer> indices = prop.getCloudIndices();	
			for(Integer ii : indices){	
				double dis = distance(average, prop.getCurrentLocation(ii));
				if(dis > (float) tol){
					++converged;
					index.get(w).setConverged(ii, false);
					//System.out.println("Not Converged " + w +" "+ prop.getCloudIndices().get(jj)+ " " + dis);
				}else{
					index.get(w).setConverged(ii, true);
				}
			}
		}
		return converged;
	}
	private double distance(PVector a, PVector b){
		return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
	}
	
	public void draw(int cloudIndex, String outPath){
		clouds[cloudIndex].show(index, cloudIndex);
		grandpa.save(outPath);
		//System.out.println(outPath);
		clouds[cloudIndex].forgetEngine();
	}

	public void reorderWords(String criteria) {
		if(criteria == "weight"){
			WordCompTWeight comp = new WordCompTWeight(index);
			for(WordCram cloud: clouds){
				Word[] newOrder = cloud.getWords();
				Arrays.sort(newOrder,comp);
				cloud.setWords(newOrder);
			}
		}else if (criteria == "center"){
			PVector center = new PVector((float) (grandpa.width*1.0/2), (float) (grandpa.height*1.0/2));
			WordCompCenter comp = new WordCompCenter(index, center);
			for(WordCram cloud: clouds){
				Word[] newOrder = cloud.getWords();
				Arrays.sort(newOrder, comp);
				cloud.setWords(newOrder);
			}
		}else{
			System.err.println("Unknown sorting criteria");
			System.exit(0);
		}
	}
	
	public Rectangle minBBox(){
		int padding = 2;
		float minX = Float.MAX_VALUE;
		float minY = Float.MAX_VALUE;
		float maxX = Float.MIN_VALUE;
		float maxY = Float.MIN_VALUE;
		for(int ii=0; ii<clouds.length; ++ii){
			Word[] words = clouds[ii].getWords();
			for(Word word: words){
				if(word.wasSkipped()) continue;
				Rectangle wRect = word.getBounds().getBounds();
				wRect.x = (int) index.get(word.word).getCurrentLocation(ii).x;
				wRect.y = (int) index.get(word.word).getCurrentLocation(ii).y;
				if(wRect.x < minX) minX = wRect.x - padding;
				if(wRect.y < minY) minY = wRect.y - padding;				
				if(wRect.x + wRect.width > maxX) maxX = wRect.x + wRect.width + padding;
				if(wRect.y + wRect.height > maxY) maxY = wRect.y + wRect.height + padding;
			}
		}
		Rectangle bBox = new Rectangle((int)minX,(int)minY,(int)(maxX-minX),(int)(maxY-minY));
		for(int ii=0; ii<clouds.length; ++ii){
			Word[] words = clouds[ii].getWords();
			for(Word word: words){
				//PVector loc = new PVector(word.getTargetPlace().x - bBox.x, word.getTargetPlace().y - bBox.y);
				if(word.wasSkipped()) continue;
				PVector loc = new PVector(word.getRenderedPlace().x - bBox.x, word.getRenderedPlace().y - bBox.y);
				word.setPlace(loc);			
				index.get(word.word).setCurrentLocation(ii, loc);
			}
		}
		bBox.x = 0;
		bBox.y = 0;
		return bBox;
	}
	
	public void scaleLayout(float scale){
		for(int ii=0; ii<clouds.length; ++ii){
			Word[] words = clouds[ii].getWords();
			for(Word word: words){
				word.weight *= scale;
				word.refactorSize(scale);
				//word.resetSize(clouds[ii].getSizer(),maxWords);
				PVector loc = index.get(word.word).getCurrentLocation(ii);
				loc.x *= scale;
				loc.y *= scale;
			}
		}
	}
	
	public void printOverlapped(int ii){
		for(String w: overlapped.get(ii).keySet()){
			String s = w+":";
			for(String ow : overlapped.get(ii).get(w)){
				s+= " "+ow;
			}
			System.out.println(s);
		}
	}
	
	public void printVocabByIdf(){
		Word[] idf = new Word[index.size()];
		int count = -1;
		for(String word: index.keySet()){
			Word w = index.get(word).getWord(index.get(word).getCloudIndices().get(0));
			idf[++count] = w;
		}
		WordCompIdf comp = new WordCompIdf(index);
		Arrays.sort(idf,comp);
		int i = 0;
		for(Word w: idf){
			System.out.println(++i+" "+w.word+" "+index.get(w.word).getIdf());
		}
	}

    public WordCram[] getClouds() {
        return clouds;
    }
}
