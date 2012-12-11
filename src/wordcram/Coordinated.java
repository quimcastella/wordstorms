package wordcram;

import java.awt.geom.Rectangle2D;
import java.util.*;
import processing.core.PApplet;
import processing.core.PConstants;
import processing.core.PVector;

/*
 * Quim Castella
 * 
 * Coordination of the word clouds
 * 
 * averageCenter- placement of the words using the iterative algorithm
 * mdsGradient- placement of the words using the optimisation approach
 * 
 * sameColor
 * sameAngle
 */

public class Coordinated {

	long rSeed;
	Random r;
	int tfIdf;
	
	Map<String, CoordProp> index;
	ArrayList<HashMap<String, ArrayList<String>>> overlapped;
	MDS mds;	
	
	public Coordinated( Map<String, CoordProp> index, MDS mds, 
			ArrayList<HashMap<String, ArrayList<String>>> overlapped, long rSeed, int tfIdf){
		this.index = index;
		this.overlapped = overlapped;
		this.mds = mds;
		this.rSeed = rSeed;	
		this.r = new Random(rSeed);
		this.tfIdf = tfIdf;
	}
	
	public void setOverlapped(ArrayList<HashMap<String, ArrayList<String>>> overlapped){
		this.overlapped = overlapped;
	}
	
	public WordPlacer averageCenter(){
		final float stdev = 0.2f;
		return new WordPlacer() {
			
			public PVector place(Word word, int wordIndex, int wordsCount,
					int wordImageWidth, int wordImageHeight, int fieldWidth, int fieldHeight) {
				
				CoordProp prop = index.get(word.word); 
//				PVector curLoc = prop.getCurrentLocation(word.cloudIndex); // BAD INIT
//				if (curLoc.z == -1.0f) //
//					return new PVector(getOneUnder(fieldWidth - wordImageWidth), // 
//							getOneUnder(fieldHeight - wordImageHeight));// 
				if( prop.getAverage().z == (float)-1 ){
					return new PVector(getOneUnder(fieldWidth - wordImageWidth),
							getOneUnder(fieldHeight - wordImageHeight));
				}else{
//					if(prop.hasConverged(word.cloudIndex)){ //GOTO THE CENTER
//						PVector curLoc = prop.getCurrentLocation(word.cloudIndex);
//						PVector center = new PVector(fieldWidth/2, fieldHeight/2);
//						PVector dirCenter = PVector.sub(center, curLoc);
//						float eps = 0.01f;
//						return PVector.add(curLoc, PVector.mult(dirCenter,eps));
//					}
					
					return prop.getAverage();
				}
			}
			private int getOneUnder(float upperLimit) {
				return PApplet.round(PApplet.map((float) r.nextGaussian()
						* stdev, -2, 2, 0, upperLimit));
			}
		};
	}

	public WordPlacer mdsGradient(){

		return new WordPlacer() {
		
			public PVector place(Word word, int wordIndex, int wordsCount,
					int wordImageWidth, int wordImageHeight, int fieldWidth, int fieldHeight) {				
//				final float stdevX = 1; //0.6f;
//				final float stdevY = 1; //0.4f;
				CoordProp prop = index.get(word.word);
				PVector curLoc = prop.getCurrentLocation(word.cloudIndex);
				PVector aver = prop.getAverage();

				if( aver.z == -1.0f ){ //First time in all word clouds
					return new PVector(r.nextInt(fieldWidth),r.nextInt(fieldHeight));
//					return new PVector(getOneUnder(fieldWidth - wordImageWidth,stdevX), 
//						getOneUnder(fieldHeight - wordImageHeight,stdevY));
				}
				if (curLoc.z == -1.0f){ //First time in this word cloud
//					return new PVector(r.nextInt(fieldWidth),r.nextInt(fieldHeight));
					return aver;
				}

				// SAME WORD
				PVector sameWordGrad = new PVector();
				if(mds.sameEps > 0.001){
					float sameWordEps = 0.000001f; // 1f; more weight?
					for(int ii: prop.getCloudIndices()){
						if(ii == word.cloudIndex) continue;
						PVector otherLoc = prop.getCurrentLocation(ii);
						sameWordGrad.x -= sameWordEps*mds.S[ii][word.cloudIndex]*(curLoc.x - otherLoc.x);	
						sameWordGrad.y -= sameWordEps*mds.S[ii][word.cloudIndex]*(curLoc.y - otherLoc.y);	
					}
					sameWordGrad.mult(mds.sameEps);
				}
				
				// OVERLAP
				boolean overlap = false;
				PVector overGrad = new PVector();
				if(mds.overEps > 0.001){
					Rectangle2D wRect = mds.rectangleLoc(word.word,word.cloudIndex);
					ArrayList<String> over = overlapped.get(word.cloudIndex).get(word.word);
					for(String other: over){
						PVector dir = genOverlapDirection(word, wRect, other);		
						overGrad.x -= dir.x;
						overGrad.y -= dir.y;
					}
					overGrad.mult(0.1f*mds.overEps);
				}
//				if(overGrad.dist(new PVector(0f,0f))> 0.1){
//					overlap = true;
//				}
				
				// COMPACT
				PVector compGrad = new PVector();
				if(!overlap && mds.compEps > 0.001){
					PVector center = new PVector((float)(1.0*fieldWidth)/2,(float) (1.0*fieldHeight)/2);
					compGrad.x = curLoc.x - center.x;
					compGrad.y = curLoc.y - center.y;
					if(compGrad.dist(new PVector()) > 1){
						compGrad.normalize();
//						compGrad.mult(5f);
					}
					compGrad.mult(0.1f*mds.compEps);
				}
				PVector step = new PVector(sameWordGrad.x + compGrad.x + overGrad.x, 
						sameWordGrad.y + compGrad.y + overGrad.y); 
				
				int maxStep = 30;
				if(step.dist(new PVector())>maxStep){
					step.normalize();
					step.mult(maxStep);
				}
				
				PVector newLoc = new PVector();
				newLoc.x = curLoc.x - step.x;
				newLoc.y = curLoc.y - step.y;			
				mds.updateGradient(step.dist(new PVector()));
				
				//SIZE WORD
//				float sizeWordEps = 0.00000001f;
//				float sizeWordGrad = 0;
//				for(int ii = 0; ii < overlapped.size(); ++ii){
//					if(ii == word.cloudIndex) continue;
//					float otherWeight = 0;
//					if(prop.getCloudIndices().contains(ii)){
//						otherWeight= prop.getWord(ii).weight;
//					}
//					sizeWordGrad += sizeWordEps*mds.S[ii][word.cloudIndex]*(word.weight - otherWeight);	
//				}
//				float aux = word.weight; 
				
//				word.weight -= sizeWordGrad;
//				System.out.println(word + " "+word.weight+" "+word.origWeight);
//				word.weight -= 0.01f*(word.weight - word.origWeight);
//				word.weight = Math.min(Math.max(word.weight, 0.1f),1.5f);
				//if(Math.abs(1-word.weight/aux)>0.001) 
				//System.out.println(word +" " +(-sizeWordGrad)+" "+word.weight/aux);
//				word.refactorSize(word.weight/aux);			
				return newLoc;
			}
			
			private PVector genOverlapDirection(Word word, Rectangle2D wRect, String other){				
				PVector oLoc = index.get(other).getCurrentLocation(word.cloudIndex);
				Rectangle2D auxRect = index.get(other).getWord(word.cloudIndex).getBounds();
				Rectangle2D oRect = new Rectangle2D.Double(oLoc.x, oLoc.y, auxRect.getWidth(), 
						auxRect.getHeight());
				return mds.minAxisOverlapDirection(wRect, oRect);
//				return mds.minAxisOverlapDirectionNoise(wRect, oRect); // not improving
//				return mds.minOverlapDirectionRed(wRect, oRect);
			}
			private int getOneUnder(float upperLimit, float stdev) {
				return PApplet.round(PApplet.map((float) r.nextGaussian()
						* stdev, -2, 2, 0, upperLimit));
			}
		};
	}
	
	public WordColorer sameColor(final PApplet host){
		return new HsbWordColorer(host) {
			
			public int getColorFor(Word w) {
				CoordProp prop = index.get(w.word);
				int color = prop.getColor();
				if( color  == -1){
					float hue = host.random(256);
					float sat = 200;//156 + host.random(100);
					float bri = 50 + host.random(150);
//					if(tfIdf == 2 || tfIdf == 3 || tfIdf == 4)
//						bri = 30+120*w.idf;
//					color = host.color(hue, sat, bri);
					float alpha = 255;
					if(tfIdf == 2) {
						float A = 40;
						float K = 100;
						float S = 20;
						float x0 = 0.2f;
						float idf = prop.getIdf();
						alpha = (255/K)*(A + (float) ((K-A)/(1+Math.exp(-S*(idf-x0)))));
					}
					color = host.color(hue, sat, bri, alpha);
					prop.setColor(color);
				}
				return color;
			}
		};
	}
	
	public WordAngler sameAngle() {
		return new WordAngler() {
			public float angleFor(Word w) {
				CoordProp prop = index.get(w.word);
				float angle = prop.getAngle();
				if( Math.abs(angle + 1f)< 0.1 ){
					float[] aux = {0f, 0f, 0f, 0f, 0f, PConstants.HALF_PI, -PConstants.HALF_PI};
					angle = aux[r.nextInt(aux.length)];
					prop.setAngle(angle);
				}
				return angle;
			}
		};
	}
}
