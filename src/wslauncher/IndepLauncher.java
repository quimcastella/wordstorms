package wslauncher;

import io.*;
import wordstorm.*;

/*
 * Quim Castella
 * 
 * Independent-Clouds generator
 */

public class IndepLauncher {
	
	public static void main(String[] args) {			
		String folder = "PresidentialDebate"; //set the path to the data with io.DataPath and folder
		AppletConf apConf = new AppletConf(640,480,255); //cloud width, height and bk color 
		
		StormConf conf = new StormConf(); //Storm Parameters
		conf.maxFiles = -1;
		conf.maxWords = 25;
//		conf.rSeed = 12345;
		conf.tfIdf = 0;
		conf.coorColorer = 0;
		conf.coorAngler = 0;
		conf.coorPlacer = 0;
		conf.tol = -1;

		Loader load = new FileLoader(conf.maxFiles, folder);
//		new FileLoaderWeight(conf.maxFiles, folder);
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
        SVGSaver.singleStorm(load, conf, apConf, f);
	}
}