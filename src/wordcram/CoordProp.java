package wordcram;

import processing.core.PVector;
import java.util.*;

/*
 * Quim Castella
 * 
 * Coordinated Properties
 * 
 * For each word, some properties that we track over all the clouds
 */

public class CoordProp {
	private int numClouds;
	
	private ArrayList<Integer> cloudIndices; //clouds where it appears
	private ArrayList<Word> words; //corresponding word object in each cloud
	private ArrayList<PVector> currentLocations;//corresponding locations
	private ArrayList<Boolean> converged;//whether has converged
	private PVector avLoc;//average location

	private int color; 
	private float idf;
	private float angle; 
	private float totWeight;
	
	
	public CoordProp(){
		numClouds = 0;
		cloudIndices = new ArrayList<Integer>();
		words = new ArrayList<Word>();
		currentLocations = new ArrayList<PVector>();
		converged = new ArrayList<Boolean>();
		avLoc = new PVector();
		color = -1;
		angle = -1f;
		totWeight = 0f;
		idf = 0f;
	}
	
	public boolean hasConverged(int cloudInd){
		int pos = cloudIndices.indexOf(new Integer(cloudInd));
		return converged.get(pos);
	}
	
	public void setConverged(int cloudInd, boolean con){
		int pos = cloudIndices.indexOf(new Integer(cloudInd));
		converged.set(pos, new Boolean(con));
	}
	
	public void setCurrentLocation(int cloudInd, PVector curLoc){
		int pos = cloudIndices.indexOf(new Integer(cloudInd));
		currentLocations.set(pos, new PVector(curLoc.x, curLoc.y));
		
		computeAverage(); 
	}
	
	public Word getWord(int cloudInd){
		int pos = cloudIndices.indexOf(new Integer(cloudInd));
		return words.get(pos);
	}
	
	public PVector getCurrentLocation(int cloudInd){
		int pos = cloudIndices.indexOf(new Integer(cloudInd));
		return currentLocations.get(pos);
	}
	
	public void computeAverage(){
		avLoc = new PVector(0,0);
		double num = 0;
		for(PVector v: currentLocations){
			if(v.z == - 1) ++num;
			avLoc.x += v.x;
			avLoc.y += v.y;
		}
		if (num == numClouds) avLoc = new PVector(0,0,-1);
		else{
			avLoc.x/=(numClouds-num);
			avLoc.y/=(numClouds-num);
		}
	}
	
	
	public float getTotWeight(){
		return totWeight;
	}
	
	public PVector getAverage(){
		return avLoc;
	}
	
	public int getNumClouds(){
		return numClouds;
	}
	
	public ArrayList<PVector> getCurrentLocations(){
		return currentLocations;
	}
	public ArrayList<Integer> getCloudIndices(){
		return cloudIndices;
	}
	
	public void addWordCloud(int cloudInd, Word w){
		++numClouds;
		cloudIndices.add(new Integer(cloudInd));
		words.add(w);
		currentLocations.add(new PVector(0,0,-1));
		converged.add(false);
		computeAverage();
		totWeight += w.weight;
	}
	
	public void setColor(int color){
		this.color = color;
	}
	
	public int getColor(){
		return this.color;
	}
	
	public void setAngle(float angle){
		this.angle = angle;
	}
	
	public float getAngle(){
		return this.angle;
	}
	
	public void setIdf(float idf){
		this.idf = idf;
	}
	
	public float getIdf(){
		return this.idf;
	}
	
	public String toString(){
		String s = ""+numClouds+" "+avLoc+" [";
		for(int ii=0; ii<numClouds; ++ii){
			s+= ""+cloudIndices.get(ii)+","+currentLocations.get(ii)+" ";
		}
		return s.substring(0,s.length()-1)+"]";
	}	
}
