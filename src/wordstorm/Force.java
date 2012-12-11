package wordstorm;

import io.*;

import java.awt.Rectangle;
import java.io.*;
import wordcram.*;

import processing.core.PApplet;

/*
 * Quim Castella
 * 
 * Force Layout WordStorm/ Gradient method
 */

public class Force extends PApplet implements Algorithm{

	StormConf conf;
	int process = 50; //Frequency updates at the console
	boolean verbose = false;
	boolean printIndex = false;
	boolean movie = false; //To print a movie of the process
	int frames = 1; //One movie frame for each "frames" iterations
	Timer time;
	String log;

	Loader load;
	AppletConf apConf;
	AppletConf desApConf;

	private WordStorm storm;
	private MDS mds;

	public Force(Loader l, AppletConf apConf, StormConf conf) {
		this.load = l;
		this.apConf = new AppletConf(apConf.width/2,apConf.height/2,apConf.bgCol);
		this.desApConf = apConf;
		this.conf = conf;
		this.randomSeed(conf.rSeed);
		logHeader();
	}

	public void setup() {
		size(apConf.width, apConf.height);
		smooth();
	}

	public WordStorm getWordStorm() {
		return storm;
	}

	public void initProcess() {
		time = new Timer();
		initStorm();
		initCoordination();
		storm.separateUnique();
		
		int cont = 0;
		System.out.println(++cont + " Iteration");
		mds.nextIteration();
		storm.moveWords(verbose);
		if(movie) fraw(1);
		printProgress(mds.getScoreMDS(), mds.getScoreOverlap(), 
				mds.getGradient(), mds.getScoreCompact(),-1);
		
		//Set of optimization problems
		float[] overEps = {0.001f, 0.01f, 0.1f, 1,    1,    1,     1,	 1};// Overlap lambda
		float[] sameEps = {1,      1,     1,    1,    0.1f, 0.01f, 0,    0};// Stress and correspondence
		float[] compEps = {0.5f,   0.5f,  0.5f, 0.5f, 0.5f, 0.5f,  0.5f, 0};// Compactness
		
//		float[] overEps = {1,	 1};// Overlap lambda
//		float[] sameEps = {0,    0};// Stress and correspondence
//		float[] compEps = {1,    0};// Compactness
		
		int end = 0;
		int maxIter = conf.maxIterations == -1? 100000 : conf.maxIterations;
		for(int ii=0; ii<overEps.length; ++ii) {
			mds.overEps = overEps[ii];
			mds.sameEps = sameEps[ii];
			mds.compEps = compEps[ii];
			mds.setGradient(100);		
			if(ii == overEps.length-1) end = 1;
			if(ii == overEps.length-2) end = 2;
			while(!mds.converged(end) && cont < maxIter) {
				++cont;
				if((cont%process)==0) System.out.println(cont + " Iteration");
			 	mds.nextIteration();
				storm.moveWords(verbose);
				if(movie && (cont%frames)==0) fraw(cont/frames);			
				if((cont%process)==0) {
					printProgress(mds.getScoreMDS(), mds.getScoreOverlap(),
							mds.getGradient(),mds.getScoreCompact(),ii);
					System.out.println("Single overlap " + mds.getOverlap());
				}
			}
		}
		storm.placeUnique(conf.rSeed);
		System.out.println("Iterations Stopped");
		if(movie) fraw((cont/frames)+1);
		fraw();
		time.stop();
		System.out.println("Finished");
		String t = "Time: " + time;
		System.out.println(t);
		printLog(t);
		
		System.out.println();
		storm.printVocabByIdf();
	}

	private void initStorm() {
		storm = new WordStorm(this);
		storm.loadText(conf, load);
		storm.cloudSettings(conf, load);
		mds = new MDS(storm, apConf, conf);
	}

	private void initCoordination() {
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
		float scale = (float) Math.min(desApConf.height*1.0/frame.height,desApConf.width*1.0/frame.width);
		storm.scaleLayout(scale);
		apConf.height = desApConf.height;
		apConf.width = desApConf.width;
		setup();
	}
	
	public void fraw() {		
		setFrame();
		String output;
		for (int ii = 0; ii < storm.numClouds; ++ii) {
			if (verbose && storm.numClouds > 50 && ii % 50 == 0)
				System.out.print(" " + ii);
			background(apConf.bgCol);
			output = load.getOutput(conf, ii);
			storm.draw(ii, output);
		}
		if (verbose && storm.numClouds > 50)
			System.out.println();
		finishUp();
	}
	
	public void fraw(int frameNum) {
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

	private void printProgress(double scoreMDS, float scoreOverlap, 
			float gradient, float scoreCompact, int l) {
		scoreMDS *= 1000;
		log += scoreMDS+", " +scoreOverlap+ ", "+scoreCompact +", "
		+(scoreOverlap+scoreMDS+scoreCompact) +"\n";
		System.out.println(l+" MDS " + scoreMDS);
		System.out.println(l+" Overlap " + scoreOverlap);
		System.out.println(l+" Compact " +scoreCompact);
		System.out.println(l+" Score " + (scoreOverlap+scoreMDS+scoreCompact));
		System.out.println(l+" Gradient " + gradient);
	}

	private void logHeader() {
		log = "word clouds, "+ load.numClouds + "\n";
		log += conf.toString() + "\n";
		log += apConf + "\n\n";
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