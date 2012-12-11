package wordcram;

import java.util.Comparator;

public class WordCompString  implements Comparator<Word> {

    // Comparator interface requires defining compare method.
    public int compare(Word worda, Word wordb) {
    	String a = worda.word;
    	String b = wordb.word;
    	return b.compareTo(a);
    }
}
