package wordstorm;

/*
 * Quim Castella
 * 
 * Storm configuration 
 */
public class StormConf {

	// General settings
	public int maxFiles = 10; //num files (-1 no limit)
	public int maxWords = 25; //num words (-1 no limit)
	public long rSeed = 123456; //random seed
	
	//Words
	public int textCase = 0; //-1 normal, 0 lower, 1 Upper
	public int scale = 0; //Word importance: 0 font size, 1 word area
	
	// Storm coordination settings
	public int tfIdf = 0; //0 no idf, 1 words selected by tfidf, 2 words colored by idf
	public int coorColorer = 0;//0 no coordinated color, 1 same color across clouds
	public int coorAngler = 0;//0 no coordinated angle, 1 same angle across clouds
	public int coorPlacer = 0;//0 independent, 1 iterative, 3 gradient, 4 combined	
	
	// Technical parameters
	public int maxIterations = 5; //num iterations (-1 no limit)
	public int tol = -1; //iterative tolerance (-1 inf tolerance)
	public int globalOrder = 0; //0 normal, 1 sort the words by global weight order
	public String comment =""; //add text to output folder/html
	
	public int getMaxFiles() {
		return maxFiles;
	}

	public int getMaxWords() {
		return maxWords;
	}

	public int getMaxIterations() {
		return maxIterations;
	}

	public long getrSeed() {
		return rSeed;
	}

	public int getTol() {
		return tol;
	}

	public int getTextCase() {
		return textCase;
	}

	public int getScale() {
		return scale;
	}

	public int getTfIdf() {
		return tfIdf;
	}

	public int getCoorColorer() {
		return coorColorer;
	}

	public int getCoorAngler() {
		return coorAngler;
	}

	public int getCoorPlacer() {
		return coorPlacer;
	}

	public int getGlobalOrder() {
		return globalOrder;
	}

	public String getComment() {
		return comment;
	}
	
	public String toString(){
		String s ="";
		if(maxFiles == -1) s+= "alld ";
		else s+=maxFiles+"d";
		s+=maxWords+"w ";
		if(coorPlacer!=3) s+= tol==-1? "noTol " : tol+"tol ";
		s+= textCase == -1? "nC": textCase == 0 ? "lC": "uC"; 
		if(tfIdf == 1) s+=" tfidf";
		else if(tfIdf == 2) s+=" idfcolor";
		else if(tfIdf == 3) s+=" tfidf idfcolor";
		else if(tfIdf == 4) s+=" tfidfW dC";
		if(scale == 1) s+=" bbox";
		
		if(coorPlacer == 1) s+=" pla";
		else if(coorPlacer == 2) s+=" softpla";
		else if(coorPlacer == 3) s+=" mdsgrad";
		else if(coorPlacer == 4) s+=" combined";
		if(coorColorer == 1) s+=" col";
		if(coorAngler == 1) s+=" ang";
		if(globalOrder == 1) s+= " ord";
		if(maxIterations != -1) s+= " "+maxIterations+"it";
		if(rSeed != 123456) s+=" "+rSeed+"s";
		if(!comment.isEmpty()) s+=" "+comment;
		return s;
	}
}
