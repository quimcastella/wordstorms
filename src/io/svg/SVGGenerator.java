package io.svg;

import wordcram.Word;
import wordcram.WordCram;
import wordcram.WordStorm;

/**
 * Created by stijnbe on 02/05/14.
 */
public class SVGGenerator {
    private int width;
    private int height;

    public SVGGenerator(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public String generateSvg(WordStorm wordStorm) {
        String svg = "";
        WordCram[] wordCrams = wordStorm.getClouds();
        for (WordCram wordCram : wordCrams) {
            svg += "<svg height=\"" + height + "px\" width=\"" + width + "px\" viewBox=\"0 0 " + width + " " + height + " xmlns=\"http://www.w3.org/2000/svg\"> \n";
            Word[] words = wordCram.getWords();
            for (Word word : words) {
                svg += renderSvgWordElement(word) + "\n";
            }
            svg += "</svg>";
        }
        return svg;
    }

    private String renderSvgWordElement(Word word) {
        return new SVGTextElement(word).toString();
    }
}
