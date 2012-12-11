package wordcram;

/*
 Copyright 2010 Daniel Bernier

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import java.awt.Shape;
import java.awt.geom.Rectangle2D;
import java.util.Arrays;

public class WordSorterAndScaler {

	public Word[] sortAndScale(Word[] rawWords) {
		return sortAndScale(rawWords, true);
	}
	
	public Word[] sortAndScale(Word[] rawWords, boolean normalise) {
		
		Word[] words = copy(rawWords);
		Arrays.sort(words);
		if (!normalise) return words;
		
		float maxWeight = words[0].weight;
		int rank = 0;
		for (Word word : words) {	
			word.weight = word.weight / maxWeight;
			word.origWeight = word.weight;
			word.rank = rank;
			++rank;
		}	
		return words;
	}
	
	// assumes sorted words
	public Word[] scaleByBoundingBox(Word[] rawWords, WordFonter fonter, WordSizer sizer) {
		
		Word[] words = copy(rawWords);
//		Rectangle2D rect =  new WordShaper().getShapeFor(words[0].word, words[0].getFont(fonter), 
//				words[0].getSize(sizer, 0, words.length), 0, 0).getBounds2D();
//		double maxArea = rect.getHeight()*rect.getWidth();
//		System.out.println(words[0]+" "+maxArea);
		Rectangle2D rect;
		double maxArea = 7000;
		double area = 0;
		double diff = 0;
		for (int rank = 0; rank<words.length; ++rank) {
			area = maxArea*words[rank].weight;
			rect =  new WordShaper().getShapeFor(words[rank].word, words[rank].getFont(fonter), 
					words[rank].getSize(sizer, rank, words.length), 0, 0).getBounds2D();
			diff = area-rect.getHeight()*rect.getWidth();
			int count = 0;
			while(Math.abs(diff)>100 && count <100){
				if(diff>0){
					words[rank].weight*=1.05f;
					words[rank].refactorSize(1.05f);
				}else{
					words[rank].weight*=0.95f;
					words[rank].refactorSize(0.95f);
				}
				rect =  new WordShaper().getShapeFor(words[rank].word, words[rank].getFont(fonter), 
						words[rank].getSize(sizer, rank, words.length), 0, 0).getBounds2D();
				diff = area-rect.getHeight()*rect.getWidth();
				++count;
			}
			//words[rank].weight = words[rank].origWeight;
			//words[rank].origWeight = words[rank].weight;
//			System.out.println(words[rank]+" "+words[rank].origWeight+" "+area+" "+rect.getHeight()*rect.getWidth());
		}
		
		return words;
	}
	
	private Word[] copy(Word[] rawWords) {
		
		// was Arrays.copyOf(rawWords, rawWords.length); - removed for Java 1.5 compatibility.		
		Word[] copy = new Word[rawWords.length];
		for(int i = 0; i < copy.length; i++) {
			copy[i] = rawWords[i];
		}
		return copy;
	}
	
	public Word[] normalizeWordsL2(Word[] auxWords){
		Word[] words = copy(auxWords);
		float sum = 0;
		for(Word word: words){
			sum += word.weight*word.weight;
		}
		sum = (float) (Math.sqrt(sum)/(words.length*0.5));
		for(Word word: words){
			word.weight /= sum;
			word.origWeight = word.weight;
		}
		return words;
	}
	public Word[] normalizeWordsL1(Word[] words){
		float sum = 0;
		for(Word word: words){
			sum += word.weight;
		}
		sum /= words.length*0.5;
		for(Word word: words){
			word.weight /= sum;
			word.weight *=1.2f;
			word.origWeight = word.weight;
		}
		return words;
	}
}
