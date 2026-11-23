package java.applet;
import java.awt.*; import java.net.URL;
public class Applet extends Panel {
  public Applet() {}
  public void setStub(AppletStub s) {}
  public boolean isActive() { return true; }
  public URL getDocumentBase() { return null; }
  public URL getCodeBase() { return null; }
  public String getParameter(String n) { return null; }
  public AppletContext getAppletContext() { return null; }
  public void showStatus(String m) {}
  public Image getImage(URL u) { return null; }
  public Image getImage(URL u, String n) { return null; }
  public AudioClip getAudioClip(URL u) { return null; }
  public String getAppletInfo() { return null; }
  public String[][] getParameterInfo() { return null; }
  public void init() {} public void start() {} public void stop() {} public void destroy() {}
}
