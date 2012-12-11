package wordcram;

import java.util.Comparator;
import java.util.Map;
import processing.core.PVector;

public class WordCompCenter implements Comparator<Word> {

		Map<String, CoordProp> index;
		PVector center;
		
		public WordCompCenter(Map<String, CoordProp> index, PVector center){
			this.index = index;
			this.center = center; 
		}
		   
	    public int compare(Word worda, Word wordb) {
	    	//PVector aLoc = index.get(worda.word).getCurrentLocation(worda.cloudIndex);
	    	//PVector bLoc = index.get(wordb.word).getCurrentLocation(wordb.cloudIndex);
	    	
	    	PVector aLoc = index.get(worda.word).getAverage();
	    	PVector bLoc = index.get(wordb.word).getAverage();
	    	
	    	Float a = aLoc.dist(center);
	    	Float b = bLoc.dist(center);
 	
	    	return a.compareTo(b);
	    }
	}
