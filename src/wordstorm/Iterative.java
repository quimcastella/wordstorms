package wordstorm;

import io.*;

import java.awt.Rectangle;
import java.io.*;

import wordcram.*; 

import processing.core.PApplet;

/*
 * Quim Castella
 * 
 * Iterative WordStorm
 */

public class Iterative extends PApplet implements Algorithm{	
	
	StormConf conf;
	boolean verbose = true;
	boolean printIndex = true;
	boolean movie = false; //To print a movie of the process
	boolean pLog = false;
	int frames = 1; //One movie frame for each "frames" iterations
	Timer time;
	String log;
	
	Loader load;
	AppletConf apConf;
	
	private WordStorm storm;
	private MDS mds;
	
	public Iterative(Loader l, AppletConf apConf, StormConf conf){
		this.load = l;
		this.apConf = apConf;
		this.conf = conf;
		this.randomSeed(conf.rSeed);
		logHeader();
	}
	
	public void setup() {
		size(apConf.width, apConf.height);
		smooth();
	}
	
	public WordStorm getWordStorm(){
		return storm;
	}
	
	public void initProcess(){
		time = new Timer();
		initStorm();
		initCoordination();
		storm.separateUnique();
		
		int cont = 0;
		if(verbose) System.out.println(++cont+" Iteration");
		storm.placeWords(printIndex, verbose);
		if(movie) fraw(1);
		int nConverged = storm.nConverged();
		if(verbose) printProgress(nConverged, mds.getScoreMDS());	
		
		int maxIter = conf.maxIterations == -1? 10000 : conf.maxIterations;
		while(conf.tol!= -1 && nConverged!=0 && cont < maxIter){
			if(verbose) System.out.println(++cont+" Iteration");
			storm.placeWords(printIndex, verbose);
			//storm.reorderWords("center"); //reorder the words using the distance towards the center
			
			if(movie && (cont%frames)==0) fraw(cont/frames);	
			nConverged = storm.nConverged();
			if(verbose) printProgress(nConverged, mds.getScoreMDS());
		}
		storm.placeUnique(conf.rSeed);
		if(verbose) System.out.println("Iterations Stopped");
		fraw();
		time.stop();
		System.out.println("Finished");
		String t = "Time: " + time;
		System.out.println(t);
		if(pLog) printLog(t);
	}
	
	private void initStorm(){
		storm = new WordStorm(this);
		storm.loadText(conf, load);
		storm.cloudSettings(conf, load);
		mds = new MDS(storm, apConf, conf);
	}

	private void initCoordination(){
		storm.createIndex();
		storm.startCoordination(mds, conf.rSeed, conf.tfIdf);
		if(conf.tfIdf == 2)
			storm.cloudIdf();
		
		if(conf.globalOrder == 1) 
			storm.reorderWords("weight");
		
		if(conf.coorPlacer == 1) 
			storm.coordinatedPlacer();
		else if(conf.coorPlacer == 3) 
			storm.mdsGradient();
		
		if(conf.coorColorer == 1) 
			storm.coordinatedColorer();
		
		if(conf.coorAngler == 1) 
			storm.coordinatedAngler();
	}

	void setFrame() {
		Rectangle frame = storm.minBBox();
		float scale = (float) Math.min(apConf.height*1.0/frame.height,apConf.width*1.0/frame.width);
		storm.scaleLayout(scale);
		setup();
	}
	
	public void fraw(){
		setFrame();
		String output;
		for(int ii = 0; ii<storm.numClouds; ++ii){
			if(verbose && storm.numClouds>50 && ii%50 == 0) 
				System.out.print(" "+ii);
			background(apConf.bgCol);
			output = load.getOutput(conf, ii);
			storm.draw(ii, output);
		}
		if(verbose && storm.numClouds>50) 
			System.out.println();		
		finishUp();
	}
	
	public void fraw(int frameNum) {
		setFrame();
		String output;
		for (int ii = 0; ii < storm.numClouds; ++ii) {
			if (verbose && storm.numClouds > 50 && ii % 50 == 0)
				System.out.print(" " + ii);
			background(apConf.bgCol);
			output = load.getOutputMovie(conf, ii, frameNum);		
			storm.draw(ii, output);
		}
		if (verbose && storm.numClouds > 50)
			System.out.println();
		finishUp();
	}
	
	private void finishUp() {
		noLoop();
		stop();
	}
	
	private void logHeader(){
		log = load.numClouds+" word clouds\n";
		log += conf.toString()+"\n";
		log += apConf+"\n\n";
	}
	
	private void printProgress(int nConverged, double mdsScore){
		log += "non-converged, "+nConverged+", ";
		log += "mds, "+mdsScore+"\n";
		System.out.println("non-converged "+nConverged);
		System.out.println("mds "+mdsScore);
	}

	private void printLog(String t) {
		try {
			FileOutputStream fstreamOut = new FileOutputStream(load.getStormLog(conf));
			DataOutputStream out = new DataOutputStream(fstreamOut);
			BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(out));
			bw.write(t+"\n");
			bw.write(log);
			bw.close();
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}