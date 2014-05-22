package io.svg;

import processing.core.PConstants;
import wordcram.Word;

import java.awt.*;

/**
 * Created by stijnbe on 02/05/14.
 */
public class SVGTextElement {
    /*
    <text
    text-anchor="middle"
    transform="translate(-18,55)rotate(60)"
    style="font-size: 99px; opacity: 1;
    font-family: Impact; fill: rgb(57, 59, 121);">
    Cat
    </text>
     */

    private Float x;
    private Float y;
    private Float size;
    private String text;
    private String svgClass;
    private String color;
    private Integer rotate;

    public SVGTextElement(Word word){
        this.x = word.getRenderedPlace().x;
        this.y = word.getRenderedPlace().y;
        this.size = word.getRenderedSize();
        this.text = word.word;
        this.svgClass = "word-" + text.replaceAll("[^a-zA-Z0-9]", "_");

        this.color = getColor(new Color(word.getRenderedColor(), true));

        float angle = word.getRenderedAngle();

        this.rotate = 0;
        if(angle == PConstants.HALF_PI){
            this.rotate = 90;
        } else if(angle == -PConstants.HALF_PI){
            this.rotate = -90;
            this.y = this.y + (float)word.getBounds().getHeight();
            this.x = this.x + (float)word.getBounds().getWidth();
        } else{
            this.y = this.y + (float)word.getBounds().getHeight();
        }
    }

    public String toString(){
        return "<text " +
                "transform=\"translate(" + x +"," + y + ")rotate(" + rotate + ")\" " +
                "style=\"font-family: ChunkFive; " +
                "font-size: " + size +"; " +
                "fill: "  + color + ";\" " +
                "class=\"" + svgClass + "\"" +
                ">" +
                text +
                "</text>";
    }

    private String getColor(Color color) {
        // rgb(30, 200, 90)
        // #ff0023
        return "#" + decToHex(color.getRed()) + decToHex(color.getGreen()) + decToHex(color.getBlue());
    }

    private String decToHex(int dec) {
        return dec > 16 ? Integer.toHexString(dec) :
                "0" + Integer.toHexString(dec);
    }
}
