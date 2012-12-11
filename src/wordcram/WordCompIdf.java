package wordcram;

import java.util.Comparator;
import java.util.Map;

public class WordCompIdf  implements Comparator<Word> {

	Map<String, CoordProp> index;
	
	public WordCompIdf(Map<String, CoordProp> index){
		this.index = index;
	}
    public int compare(Word worda, Word wordb) {
    	Float a = index.get(worda.word).getIdf();
    	Float b = index.get(wordb.word).getIdf();
    	return b.compareTo(a);
    }
}
