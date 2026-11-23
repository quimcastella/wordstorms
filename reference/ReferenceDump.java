import io.FileLoader;
import io.Loader;
import wordcram.Word;
import wordcram.WordCram;
import wordcram.WordStorm;
import wordstorm.*;

import java.awt.geom.Rectangle2D;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Locale;

/*
 * Runs the original Java Word Storm on the example data and dumps the final
 * layout as JSON, so the TypeScript port can be compared against it.
 *
 * Usage: java ReferenceDump <mode: coordinated|independent> <out.json>
 * (expects examples/data/input/PresidentialDebate relative to the cwd)
 */
public class ReferenceDump {

	public static void main(String[] args) throws IOException {
		String mode = args.length > 0 ? args[0] : "coordinated";
		String out = args.length > 1 ? args[1] : mode + ".json";
		String folder = "PresidentialDebate";
		AppletConf apConf = new AppletConf(640, 480, 255);

		StormConf conf = new StormConf();
		conf.maxFiles = -1;
		conf.maxWords = 25;
		if (mode.equals("coordinated")) { // same as StormLauncher
			conf.tfIdf = 2;
			conf.coorColorer = 1;
			conf.coorAngler = 1;
			conf.coorPlacer = 4;
			conf.tol = 50;
			conf.maxIterations = 5;
		} else { // same as IndepLauncher
			conf.tfIdf = 0;
			conf.coorColorer = 0;
			conf.coorAngler = 0;
			conf.coorPlacer = 0;
			conf.tol = -1;
		}

		Loader load = new FileLoader(conf.maxFiles, folder);
		Algorithm f;
		if (conf.coorPlacer <= 1) f = new Iterative(load, apConf, conf);
		else if (conf.coorPlacer == 3) f = new Force(load, apConf, conf);
		else f = new Combined(load, apConf, conf);
		f.init();
		f.initProcess();

		WordStorm storm = f.getWordStorm();
		StringBuilder sb = new StringBuilder();
		sb.append("{\n  \"mode\": \"").append(mode).append("\",\n");
		sb.append("  \"config\": \"").append(conf).append("\",\n");
		sb.append("  \"width\": ").append(apConf.getWidth()).append(",\n");
		sb.append("  \"height\": ").append(apConf.getHeight()).append(",\n");
		sb.append("  \"clouds\": [\n");
		WordCram[] clouds = storm.getClouds();
		for (int c = 0; c < clouds.length; c++) {
			sb.append("    {\"name\": \"").append(load.getName(c)).append("\", \"words\": [\n");
			Word[] words = clouds[c].getWords();
			for (int i = 0; i < words.length; i++) {
				Word w = words[i];
				Rectangle2D b = w.getBounds();
				sb.append(String.format(Locale.ROOT,
						"      {\"text\": \"%s\", \"weight\": %.6f, \"origWeight\": %.6f, \"placed\": %b, "
								+ "\"size\": %.4f, \"angle\": %.6f, \"color\": \"#%06x\", "
								+ "\"x\": %.4f, \"y\": %.4f, \"bounds\": [%.4f, %.4f, %.4f, %.4f]}%s\n",
						w.word, w.weight, w.origWeight, w.wasPlaced(),
						w.getRenderedSize(), w.getRenderedAngle(), w.getRenderedColor() & 0xffffff,
						w.getRenderedPlace() == null ? Float.NaN : w.getRenderedPlace().x,
						w.getRenderedPlace() == null ? Float.NaN : w.getRenderedPlace().y,
						b == null ? 0 : b.getX(), b == null ? 0 : b.getY(),
						b == null ? 0 : b.getWidth(), b == null ? 0 : b.getHeight(),
						i < words.length - 1 ? "," : ""));
			}
			sb.append("    ]}").append(c < clouds.length - 1 ? "," : "").append("\n");
		}
		sb.append("  ]\n}\n");
		try (FileWriter fw = new FileWriter(out)) {
			fw.write(sb.toString());
		}
		System.out.println("Wrote " + out);
		System.exit(0);
	}
}
