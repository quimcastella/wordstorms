package wordcram;

import java.util.Comparator;
import java.util.Map;

public class WordCompTWeight  implements Comparator<Word> {

	Map<String, CoordProp> index;
	
	public WordCompTWeight(Map<String, CoordProp> index){
		this.index = index;
	}
    public int compare(Word worda, Word wordb) {
    	Float a = index.get(worda.word).getTotWeight();
    	Float b = index.get(wordb.word).getTotWeight();    	
    	return b.compareTo(a);
    }
}

