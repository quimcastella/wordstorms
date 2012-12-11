package wordstorm;

/*
 * Quim Castella
 * 
 * Applet configuration 
 * Width, height and background color of each cloud.
 */

public class AppletConf {
	int width;
	int height;
	int bgCol;
	
	public AppletConf(){
		width = 640;
		height = 480;
		bgCol = 255;
	}
	
	public AppletConf(int width, int height, int bgCol){
		this.width = width;
		this.height = height;
		this.bgCol = bgCol;
	}
	
	public int getWidth() {
		return width;
	}

	public int getHeight() {
		return height;
	}
	public String toString(){
		return "width "+width+", height "+height;
	}
}