package io;


import java.io.BufferedWriter;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;

import wordstorm.AppletConf;
import wordstorm.StormConf;

public class HTMLSaver {
	
	static float fac = 0.5f; // the size of the clouds is reduced by this factor (fac) in the HTML page
	
	public static void singleStorm(Loader load, StormConf conf, AppletConf apConf){
		try{
			//System.out.println(load.getStormHTML(conf));
			File f = new File(load.getHTMLFolder());
			f.mkdirs();
			FileOutputStream fstream = new FileOutputStream(load.getStormHTML(conf));
			DataOutputStream out = new DataOutputStream(fstream);
			BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(out));
			bw.write("<!DOCTYPE html>\n<html>\n<body>\n");
			bw.write("<h3>\n");
			bw.write("Word Storm");
			bw.write("</h3>");
			writeSingleTable(bw, load, conf, apConf);
			bw.write("<p>");
			bw.write("folder:  "+load.getFolder());
			bw.write("</p>");
			bw.write("<p>");
			bw.write("files: "+load.numClouds);
			bw.write("</p>");
			bw.write("<p>");
			bw.write("parameters:  "+conf);
			bw.write("</p>");
			bw.write("</body>\n</html>");
			bw.close();
			out.close();
			fstream.close();
		}catch (Exception e){
			System.err.println("Error: output" + e.getMessage());
		}
	}
	
	public static void writeSingleTable(BufferedWriter bw, Loader load, StormConf conf, AppletConf apConf){
		int border = 0;
		
		int imgWidth = (int)(fac*apConf.getWidth());
		int imgHeight = (int)(fac*apConf.getHeight());
		int numClouds = load.numClouds;
		String name;
		try {
			bw.write("<table border= \""+border+"\">");
			bw.write("<tr>\n");
			bw.write("</tr>\n");
			int ii = 0;
			int square = (int) Math.ceil(Math.sqrt(numClouds)); 
			for(int jj =0; jj<=square; ++jj){
				bw.write("<tr>\n");
				for(ii = 0; ii<square && (jj*square + ii)<numClouds; ++ii){
					name = load.getName((jj*square + ii));
					bw.write("<td>\n");
					bw.write("<a href= \""+load.getLocalOutput(conf, (jj*square + ii))+"\">");
					bw.write("<img src=\""+load.getLocalOutput(conf, (jj*square + ii))+"\" alt="+name+" "+" width=\""+imgWidth+"\" height=\"" +imgHeight+"\" />"+"\n");
					bw.write("<p>"+name+"</p> \n");
					bw.write("</a>\n");
					bw.write("</td>\n");
				}
				bw.write("</tr>\n");
			}
			bw.write("</table>");
		} catch (IOException e) {
			System.err.println("WriteTable Error: " + e.getMessage());
			e.printStackTrace();
		}
	}
}
