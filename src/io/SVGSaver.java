package io;

import io.svg.SVGGenerator;
import wordstorm.Algorithm;
import wordstorm.AppletConf;
import wordstorm.StormConf;

import java.io.*;

/**
 * Created by stijnbe on 22/05/14.
 */
public class SVGSaver {
    public static void singleStorm(Loader load, StormConf conf, AppletConf apConf, Algorithm algorithm) {
        SVGGenerator svgGenerator = new SVGGenerator(apConf.getWidth(), apConf.getHeight());
        String svg = svgGenerator.generateSvg(algorithm.getWordStorm());
        try{
            File f = new File(load.getHTMLFolder());
            f.mkdirs();
            FileOutputStream fstream = new FileOutputStream(load.getStormSVG(conf));
            DataOutputStream out = new DataOutputStream(fstream);
            BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(out));
            bw.write("<!DOCTYPE html>\n<html>\n<body>\n");
            bw.write("<h3>\n");
            bw.write("Word Storm");
            bw.write("</h3>");
            bw.write(svg);
            bw.write("<p>");
            bw.write("folder:  "+load.getFolder());
            bw.write("</p>");
            bw.write("<p>");
            bw.write("Clouds: "+load.numClouds);
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
}
