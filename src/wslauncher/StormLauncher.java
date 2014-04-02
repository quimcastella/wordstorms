package wslauncher;

import io.*;
import wordstorm.*;

/*
 * Quim Castella
 * 
 * Storm generator
 */

public class StormLauncher {
	
	public static void main(String[] args) {			
		String folder = "";
		AppletConf apConf = new AppletConf(640,480,255); //cloud width, height and bk color 
		
		StormConf conf = new StormConf(); //Storm Parameters
		conf.maxFiles = -1;
		conf.maxWords = 25;
//		conf.rSeed = 12345;
		conf.tfIdf = 2;
		conf.coorColorer = 1;
		conf.coorAngler = 1;
		conf.coorPlacer = 4; //4 combined alg	
		conf.tol = 50;
		conf.maxIterations = 5;

		Loader load = new FileLoader(conf.maxFiles, folder);
//		load = new FileLoaderWeight(conf.maxFiles, folder);
		Algorithm f;		
		if(conf.coorPlacer <= 1)
			f = new Iterative(load, apConf, conf);
		else if(conf.coorPlacer == 3) 
			f = new Force(load, apConf, conf);
		else 
			f = new Combined(load, apConf,conf);	
		f.init(); 
		f.initProcess();	
		HTMLSaver.singleStorm(load, conf, apConf);
	}
}
