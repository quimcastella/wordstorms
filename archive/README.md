# Archive: the original Word Storm

Word storms started as a master's project, written in Java on top of
[WordCram](https://github.com/danbernier/WordCram) and Processing and published
here in December 2012. That version made the storms in the paper. This
repository has since been rewritten in TypeScript, and the Java code was
removed; this folder keeps a few things from it to look back on. Nothing here
is used by the current code.

| What | Where |
|---|---|
| The original README | [original-README.md](original-README.md) |
| Two storms made with the original version, as figures (the first one was the original README's picture) | [images/](images/) |
| The 2012 US presidential debates: the six transcripts and two storms the original version made from them | [presidential-debates/](presidential-debates/) |

The debate runs are named after their settings, as the original version named
its output folders: both use all the debates (`alld`), 25 words per cloud and
coordinated layouts. `50tol … combined col ang 5it` is the Combined layout with
a 50 px tolerance, idf-based fading, and coordinated colors and angles over 5
iterations; `noTol … 5it` runs without a tolerance. Open
the `.html` files to see each storm as a grid.

## The full original code

The Java version is still in the git history. The tag `java-original` marks
its last commit (May 2014):

```bash
git checkout java-original
```

On GitHub: [tree/java-original](https://github.com/quimcastella/wordstorms/tree/java-original).
