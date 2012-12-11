package wordcram;

import java.awt.geom.Rectangle2D;
import java.util.*;

import processing.core.PVector;
import wordstorm.AppletConf;
import wordstorm.StormConf;

public class MDS {
	//optimization thresholds
	public float thr = 0.2f;
	public float semiThr = 0.1001f;
	public float finalThr = 0.01f;
	
	public float overEps;
	public float compEps;
	public float sameEps;
	public float disCloudsLambda; 
	
	WordStorm ws;
	float[][] docDisMat; //distance matrix between documents
	float[][] docDotMat; //dot product matrix
	float[][] S;
	
	private float overlap;
	private float gradient;
	private float prevG;
	
	private PVector center;
	
	public MDS(WordStorm ws, AppletConf apConf, StormConf conf){
		this.ws = ws;
		this.matrixDisDocs();
		
		this.gradient = Float.MAX_VALUE;
		this.prevG = Float.MAX_VALUE;
		this.overlap = 0;
		
		this.overEps = 1;
		this.compEps = 1;
		this.sameEps = 1;
		this.center = new PVector(apConf.getWidth()*1.0f/2,apConf.getHeight()*1.0f/2);
		this.disCloudsLambda = 1; // conf.maxWords*4.0f/(apConf.width*apConf.width+apConf.height*apConf.height);
	}
	
	//
	// Distance or dot product not normalized
	//
	public void matrixDisDocs(){
		matrixDisDocs(false);
	}
	
	public void matrixDisDocs(boolean norm){	
		docDisMat = new float[ws.numClouds][ws.numClouds];
		docDotMat = new float[ws.numClouds][ws.numClouds];
		for(int ii = 0; ii<ws.numClouds-1; ++ii){
			docDisMat[ii][ii] = 0f;
			Word[] wii = ws.clouds[ii].getWords();		
			reorderWords(wii);
			if(norm) wii = new WordSorterAndScaler().normalizeWordsL2(wii);
			for (int jj = ii+1; jj<ws.numClouds; ++jj){
				Word[] wjj = ws.clouds[jj].getWords();
				reorderWords(wjj);
				if(norm) wjj = new WordSorterAndScaler().normalizeWordsL2(wjj);
				docDisMat[ii][jj] = docDisMat[jj][ii] = disWords(wjj,wii);
				docDotMat[ii][jj] = docDotMat[jj][ii] = dotWords(wjj,wii);
			}
		}
	}
	
	public String printMatrixDisDocs(){
		String s = "";
		for(int ii=0; ii<ws.numClouds; ++ii){
			for(int jj=0; jj<ws.numClouds; ++jj){
				s+=docDisMat[ii][jj]+", ";
			}
			s+="\n";
		}
		return s;
	}
	
	public String printMatrixDotDocs(){
		String s = "";
		for(int ii=0; ii<ws.numClouds; ++ii){
			for(int jj=0; jj<ws.numClouds; ++jj){
				s+=docDotMat[ii][jj]+", ";
			}
			s+="\n";
		}
		return s;
	}
	
	float disDocs(int ii, int jj){
		Word[] wii = ws.clouds[ii].getWords();
		Word[] wjj = ws.clouds[jj].getWords();
		reorderWords(wii);
		reorderWords(wjj);
		return disWords(wii,wjj);
	}
	
	float disWords(Word[] wii, Word[] wjj){
		float dis = 0;
		int ii = 0;
		int jj = 0;
		while(ii!=wii.length || jj!=wjj.length){
			if(ii==wii.length){
				dis += wjj[jj].weight*wjj[jj].weight;
				++jj;
			}else if(jj==wjj.length) {
				dis += wii[ii].weight*wii[ii].weight;
				++ii;
			}else if(wii[ii].word.compareTo(wjj[jj].word) > 0){
				dis += wii[ii].weight*wii[ii].weight;
				++ii;
			}else if(wjj[jj].word.compareTo(wii[ii].word) > 0){
				dis += wjj[jj].weight*wjj[jj].weight;
				++jj;
			}else if(wii[ii].word.equals((wjj[jj].word))){
				dis += Math.pow(wii[ii].weight - wjj[jj].weight, 2);
				++ii; ++jj;
			}else {
				System.err.println("error no pensat");
			}	
		}
		return dis;
	}
	
	float dotWords(Word[] wii, Word[] wjj){
		float dis = 0;
		int ii = 0;
		int jj = 0;
		while(ii!=wii.length && jj!=wjj.length){
			if(wii[ii].word.compareTo(wjj[jj].word) > 0){
				++ii;
			}else if(wjj[jj].word.compareTo(wii[ii].word) > 0){
				++jj;
			}else if(wii[ii].word.equals((wjj[jj].word))){
				dis += wii[ii].weight*wjj[jj].weight;
				++ii; ++jj;
			}else {
				System.err.println("error no pensat");
			}	
		}
		return dis;
	}
	
	Map<String, Word> arrayToMap(Word[] wjj){
		Map<String, Word> wjjMap = new HashMap<String,Word>();
		for(Word w: wjj){
			wjjMap.put(w.word, w);
		}	
		return wjjMap;
	}

	public double getScore(){
		return getScoreMDS() + getScoreOverlap() + getScoreCompact();
	}

	public double getScoreMDS(){
		S = new float[ws.numClouds][ws.numClouds];
		double score = 0;
		for(int ii = 0; ii<ws.numClouds-1; ++ii){
			S[ii][ii] = 0;
			for (int jj = ii+1; jj<ws.numClouds; ++jj){
				S[ii][jj] = S[jj][ii] = (docDisMat[ii][jj] - disClouds(ii,jj))/(docDisMat[ii][jj] == 0? 1:docDisMat[ii][jj]);
				score += Math.pow(S[ii][jj], 2)/Math.pow(10, 9);
			}
		}
		return score;
	}
	
	public float getScoreOverlap(){
		float score = 0;
		for(int ii=0; ii<ws.numClouds; ++ii){
			score += overEps*overlapped(ii);
		}
		return score;
	}
	
	public float getScoreCompact(){
		float score = 0;
		PVector curLoc;
		for(int ii=0; ii<ws.numClouds; ++ii){
			Word[] words = ws.clouds[ii].getWords();
			for(int jj=0; jj<words.length; ++jj){
				curLoc = ws.index.get(words[jj].word).getCurrentLocation(ii);
				score += compEps*Math.pow(curLoc.dist(center),2);
			}
		}
		return score;
	}
	
	public float disClouds(int ii, int jj){
		float dis = 0;
		Word[] wii = ws.clouds[ii].getWords();
		Word[] wjj = ws.clouds[jj].getWords();
		reorderWords(wii);
		reorderWords(wjj);
		dis += disWords(wii, wjj);
		dis += disCloudsLambda*disPositions(wii,wjj);		
		return dis;
	}
	
	public float disPositions(Word[] wii, Word[] wjj){
		float sum = 0;
		float dis = 0;
		int ii = 0;
		int jj = 0;
		while(ii!=wii.length && jj!=wjj.length){
			if(wii[ii].word.compareTo(wjj[jj].word) > 0){
				++ii;
			}else if(wjj[jj].word.compareTo(wii[ii].word) > 0){
				++jj;
			}else if(wii[ii].word.equals((wjj[jj].word))){
				PVector iiLoc = ws.index.get(wii[ii].word).getCurrentLocation(wii[ii].cloudIndex);
				PVector jjLoc = ws.index.get(wjj[jj].word).getCurrentLocation(wjj[jj].cloudIndex);
				dis = PVector.dist(iiLoc,jjLoc);
				sum += dis*dis;
				++ii; ++jj;
			}else {
				System.err.println("error no pensat");
			}	
		}
		return sum;
	}
	
	public float overlapped(int cloudIndex){
		float score = 0;
		float itScore = 0;
		HashMap<String,ArrayList<String>> overlapped = ws.overlapped.get(cloudIndex);
		for(String word: overlapped.keySet()){
			ArrayList<String> others = overlapped.get(word);
			Iterator<String> itr = others.iterator();
			Rectangle2D wRect = rectangleLoc(word, cloudIndex);
		    while(itr.hasNext()){
		    	String other = itr.next();
		    	Rectangle2D oRect = rectangleLoc(other, cloudIndex);	
		    	itScore = overlapPenalty(wRect,oRect);
		    	score += itScore;
		    	if(this.overlap < itScore) this.overlap = itScore;
		  	}
		}
		return score;
	}
	public Rectangle2D rectangleLoc(String word, int cloudIndex){
		PVector wordLoc = ws.index.get(word).getCurrentLocation(cloudIndex);
		Rectangle2D wordRect = ws.index.get(word).getWord(cloudIndex).getBounds();
		Rectangle2D wRect = new Rectangle2D.Double(wordLoc.x, wordLoc.y, wordRect.getWidth(), wordRect.getHeight());
		return wRect;
	}
	
	// Direction we want to move rectangle a to not overlap rectangle b
	public PVector minCtAxisOverlapDirection(Rectangle2D a, Rectangle2D b){
		double west = b.getX() + b.getWidth() - a.getX();
		double east = a.getX() + a.getWidth() - b.getX();
		double north = b.getY() + b.getHeight() - a.getY();
		double south = a.getY() + a.getHeight() - b.getY();
		PVector dir = new PVector();
		double min = Double.MAX_VALUE;
		if( min > west){
			min = west;
			dir = new PVector(1,0);
		}
		if( min > east){
			min = east;
			dir = new PVector(-1,0);
		}
		if( min > north){
			min = north;
			dir = new PVector(0,1);
		}
		if( min > south){
			min = south;
			dir = new PVector(0,-1);
		}
//		dir.mult(0.1f);
		return dir;
	}
	
	
	public PVector minCtOverlapDirection(Rectangle2D a, Rectangle2D b){
		double west = b.getX() + b.getWidth() - a.getX();
		double east = a.getX() + a.getWidth() - b.getX();
		double north = b.getY() + b.getHeight() - a.getY();
		double south = a.getY() + a.getHeight() - b.getY();
		PVector dir = new PVector();
		if( east > west){
			dir.x = 1;
		}else{
			dir.x = -1;
		}
		if( south > north){
			dir.y = 1;
		}else{
			dir.y = -1;
		}
		dir.mult(0.2f);
		return dir;
	}
	
	public PVector minAxisOverlapDirection(Rectangle2D a, Rectangle2D b){
		double west = b.getX() + b.getWidth() - a.getX();
		double east = a.getX() + a.getWidth() - b.getX();
		double north = b.getY() + b.getHeight() - a.getY();
		double south = a.getY() + a.getHeight() - b.getY();
		PVector dir = new PVector();
		float step = 0f;
		double min = Double.MAX_VALUE;
		if( min > west){
			min = west;
			dir = new PVector((float) Math.max(west,step),0);
		}
		if( min > east){
			min = east;
			dir = new PVector((float)-Math.max(east,step),0);
		}
		if( min > north){
			min = north;
			dir = new PVector(0,(float)Math.max(north,step));
		}
		if( min > south){
			min = south;
			dir = new PVector(0,(float)-Math.max(south,step));
		}
		return dir;
	}
	
	public PVector minAxisOverlapDirectionNoise(Rectangle2D a, Rectangle2D b){
		double west = b.getX() + b.getWidth() - a.getX();
		double east = a.getX() + a.getWidth() - b.getX();
		double north = b.getY() + b.getHeight() - a.getY();
		double south = a.getY() + a.getHeight() - b.getY();
		PVector dir = new PVector();
		float step = 0f;
		float eps = 0.25f;
		eps = (new Random().nextFloat()>0.5f)? eps: -1*eps;
		double min = Double.MAX_VALUE;
		if( min > west){
			min = west;
			dir = new PVector((float) Math.max(west,step),(float)(eps*min));
		}
		if( min > east){
			min = east;
			dir = new PVector((float)-Math.max(east,step),(float)(eps*min));
		}
		if( min > north){
			min = north;
			dir = new PVector((float)(eps*min),(float)Math.max(north,step));
		}
		if( min > south){
			min = south;
			dir = new PVector((float)(eps*min),(float)-Math.max(south,step));
		}
		return dir;
	}
	
	
	public PVector minOverlapDirection(Rectangle2D a, Rectangle2D b){
		double west = b.getX() + b.getWidth() - a.getX();
		double east = a.getX() + a.getWidth() - b.getX();
		double north = b.getY() + b.getHeight() - a.getY();
		double south = a.getY() + a.getHeight() - b.getY();
		PVector dir = new PVector();
		if( east > west){
			dir.x = (float) west;
		}else{
			dir.x = (float) -east;
		}
		if( south > north){
			dir.y = (float) north;
		}else{
			dir.y = (float) -south;
		}
		return dir;
	}
	
	public PVector minOverlapDirectionRed(Rectangle2D a, Rectangle2D b){
		double west = b.getX() + b.getWidth() - a.getX();
		double east = a.getX() + a.getWidth() - b.getX();
		double north = b.getY() + b.getHeight() - a.getY();
		double south = a.getY() + a.getHeight() - b.getY();
		PVector dir = new PVector();
		if( east > west){
			dir.x = (float) west;
		}else{
			dir.x = (float) -east;
		}
		if( south > north){
			dir.y = (float) north;
		}else{
			dir.y = (float) -south;
		}
		float eps = 0.5f;
		if(Math.abs(dir.x) > Math.abs(dir.y)){
			dir.x = Math.signum(dir.x)*eps*Math.abs(dir.y);
		}else{
			dir.y = Math.signum(dir.y)*eps*Math.abs(dir.x);
		}
		
		return dir;
	}
	
	
	public double minOverlapDistance(Rectangle2D a, Rectangle2D b){
		double minX = Math.min(b.getX()+b.getWidth() -a.getX(), a.getX()+a.getWidth()  -b.getX());
		double minY = Math.min(b.getY()+b.getHeight()-a.getY(), a.getY()+a.getHeight() -b.getY());
		return Math.max(0, Math.min(minX,minY)+1);
	}
	
	public float overlapPenalty(Rectangle2D a, Rectangle2D b){
		return (float) (Math.pow(minOverlapDistance(a,b),2));
	}	
	
	public void reorderWords(Word[] w) {
		WordCompString comp = new WordCompString();
		Arrays.sort(w,comp);
	}

	public float getGradient() {
		return gradient;
	}
	
	public boolean converged(int end){
		if(end==1) 
			return overlap < 10 || (gradient<finalThr && prevG <finalThr) ;
		if(end==2) return gradient<semiThr;
		return gradient<thr; //&& prevG <thr;
	}
	
	public void nextIteration() {
		this.prevG = gradient;
		this.gradient = 0;
		this.overlap = 0;
	}
	
	public void updateGradient(float add){
		this.gradient = Math.max(add, this.gradient);
	}
	public void setGradient(float gradient) {
		this.gradient = gradient;
	}
	
	public float getOverlap(){
		return overlap;
	}
	public String printMDSSimilarities(String inPath){
		String out = "";
		PixProd pixProd = new PixProd(inPath);
		this.matrixDisDocs(true);
		float[][] pixel = pixProd.getPixProd();
		for(int ii = 0; ii<ws.numClouds-1; ++ii){
			for (int jj = ii+1; jj<ws.numClouds; ++jj){
				out += ii+", "+jj+", "+docDotMat[ii][jj]+", "+pixel[ii][jj]+"\n";		
			}
		}
		return out;
	}
}
