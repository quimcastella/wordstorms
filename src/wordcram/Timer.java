package wordcram;

import java.util.concurrent.TimeUnit;

public class Timer {
	long millis;
	
	public Timer(){
		millis = System.currentTimeMillis();
	}
	
	public long stop(){
		millis = System.currentTimeMillis() - millis;
		return millis;
	}
	
	public String toString(){
		return String.format("%d ms (%d min %d sec)", millis,
			    TimeUnit.MILLISECONDS.toMinutes(millis),
			    TimeUnit.MILLISECONDS.toSeconds(millis) - TimeUnit.MINUTES.toSeconds(TimeUnit.MILLISECONDS.toMinutes(millis))
			    );
	}

}
