package wordcram;
import io.DataPath;

import java.awt.image.*;
import java.awt.Rectangle;
import java.io.*;
import java.util.*;

import javax.imageio.ImageIO;

/*
 * Quim Castella
 * 
 * Pixel dot product of the resulting clouds
 * Not used
 */

public class PixProd {
	String inPath;;
	
	public PixProd(String inPath){
		this.inPath = inPath+"/L0 100D 25w noTol lC";
	}
	
	public float[][] getPixProd(){
		File dir = new File(inPath);
		File[] dirs = getFolders(dir);

		ArrayList<File> imgList = new ArrayList<File>();
		for(int ii=0; ii<dirs.length; ++ii){
			File[] imgs = getImages(dirs[ii]);
			imgList.addAll(Arrays.asList(imgs));
			
		}
		
		int num = imgList.size();
		float[][] table = new float[num][num];
		System.out.println(num);
		for(int jj = 0; jj<num; ++jj){
			for (int kk = 0; kk<num; ++kk){
				String jjId = getId(imgList.get(jj));
				String kkId = getId(imgList.get(kk));
				if(Integer.parseInt(jjId)<Integer.parseInt(kkId)){
					float dot = pixelDotProduct(imgList.get(jj),imgList.get(kk));
					table[Integer.parseInt(jjId)][Integer.parseInt(kkId)] = table[Integer.parseInt(kkId)][Integer.parseInt(jjId)] = dot;
					//System.out.println("("+jjId+","+kkId+"); "+dot);
				}
			}
		}
		return table;
	}
	
	
	public static float pixelDotProduct(File iiFile, File jjFile){
		float dot = 0;
		try {
			BufferedImage iiImg = ImageIO.read(iiFile);
		    Raster iiRas = iiImg.getData();

			BufferedImage jjImg = ImageIO.read(jjFile);
		    Raster jjRas = jjImg.getData();
		    
		    Rectangle rect = iiRas.getBounds();
		    float iiNorm = 0;
		    float jjNorm = 0;
		    for(int xx = rect.x; xx<rect.width; ++xx){
		    	for(int yy = rect.y; yy<rect.height; ++yy){
		    		int[] iiPixel = new int[3];
		    		iiPixel = iiRas.getPixel(xx,yy,iiPixel);
		    		int[] jjPixel = new int[3];
		    		jjPixel = jjRas.getPixel(xx,yy,jjPixel);
		    		for(int nn=0; nn<3; ++nn){
		    			iiNorm += adapt(iiPixel[nn])*adapt(iiPixel[nn]);
		    			jjNorm += adapt(jjPixel[nn])*adapt(jjPixel[nn]);
		    		}
		    	}
		    }
		    iiNorm = (float) Math.sqrt(iiNorm);
		    jjNorm = (float) Math.sqrt(jjNorm);
		    for(int xx = rect.x; xx<rect.width; ++xx){
		    	for(int yy = rect.y; yy<rect.height; ++yy){
		    		int[] iiPixel = new int[3];
		    		iiPixel = iiRas.getPixel(xx,yy,iiPixel);
		    		int[] jjPixel = new int[3];
		    		jjPixel = jjRas.getPixel(xx,yy,jjPixel);
		    		for(int nn=0; nn<3; ++nn){
		    			dot += adapt(iiPixel[nn])*adapt(jjPixel[nn])/(iiNorm*jjNorm);
		    		}
		    	}
		    }
		}catch(IOException e) {
			System.err.println("Loading Image Error: " + e.getMessage());
			e.printStackTrace();
		}
		return dot;
	}
	
	public static String getId(File f){
		String id = f.getName();
		return id.substring(0, id.indexOf('-'));
	}
	
	public static float adapt(float a){
		return (255-a)/255;
	}
	
	public static File[] getImages(File dir){
		FileFilter imgFilter = new FileFilter() {
		    public boolean accept(File file) {
		        return file.getName().endsWith(".png");
		    }
		};
		ArrayList<File> imgs = new ArrayList<File>();
		imgs.addAll(Arrays.asList(dir.listFiles(imgFilter)));
		//System.out.println(imgs.size());
		
		ArrayList<File> subdir = new ArrayList<File>(Arrays.asList(getFolders(dir)));
		//System.out.println("\ts "+subdir.size());
		while(!subdir.isEmpty()){
			File sd = subdir.remove(0);
			imgs.addAll(Arrays.asList(sd.listFiles(imgFilter)));
			subdir.addAll(Arrays.asList(getFolders(sd)));
		}
		//System.out.println("\t"+imgs.size());
		File[] aux = new File[imgs.size()];
		if(!imgs.isEmpty()){
			imgs.toArray(aux);
			return aux;
		}
		return new File[0];
	}
	
	
	public static File[] getFolders(File dir){
		
		FileFilter fileFilter = new FileFilter() {
		    public boolean accept(File file) {
		        return file.isDirectory();
		    }
		};
		File[] dirs = dir.listFiles(fileFilter);
//		System.out.println(dirs.length+ " classes");
		return dirs;
	}

}
