package wordstorm;

import wordcram.WordStorm;

public interface Algorithm {
	public void init();
	public void initProcess();
    public WordStorm getWordStorm();
}