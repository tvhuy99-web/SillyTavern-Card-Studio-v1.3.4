export function createEpubImport(dependencies = {}) {
var readEpub = async file => {
  try {
    if (!file || file.size === 0 || file.size > 209715200) throw Error("File EPUB trống hoặc vượt quá giới hạn 200 MB.");
    let archive = await (await (0, dependencies.loadLibraryModule)(async () => {
      let {default: zipLibrary} = await import("../../../assets/jszip.min-CF4xG0Dr.js").then(module => (0, dependencies.wrapModule)(module.default, 1));
      return {default: zipLibrary};
    })).default.loadAsync(await file.arrayBuffer());
    let entries = Object.values(archive.files);
    if (entries.length > 2e4) throw Error("EPUB chứa quá nhiều mục.");
    if (entries.reduce((total, entry) => {
      let size = Number(entry._data?.uncompressedSize);
      return total + (Number.isFinite(size) && size > 0 ? size : 0);
    }, 0) > 536870912) throw Error("EPUB quá lớn sau khi giải nén.");
    let containerXml = await archive.file("META-INF/container.xml")?.async("string");
    if (!containerXml) throw Error("Không tìm thấy META-INF/container.xml (File EPUB hỏng?)");
    let parser = new DOMParser();
    let packagePath = parser.parseFromString(containerXml, "application/xml").querySelector("rootfile")?.getAttribute("full-path");
    if (!packagePath) throw Error("Không xác định được đường dẫn file OPF.");
    let packageXml = await archive.file(packagePath)?.async("string");
    if (!packageXml) throw Error(`Không tìm thấy file OPF tại ${packagePath}`);
    let packageDocument = parser.parseFromString(packageXml, "application/xml");
    let manifestItems = Array.from(packageDocument.getElementsByTagName("item"));
    let spineItems = Array.from(packageDocument.getElementsByTagName("itemref"));
    let hrefById = {};
    manifestItems.forEach(item => {
      let itemId = item.getAttribute("id"), href = item.getAttribute("href");
      if (itemId && href) hrefById[itemId] = href;
    });
    let slashIndex = packagePath.lastIndexOf("/");
    let basePath = slashIndex === -1 ? "" : packagePath.substring(0, slashIndex + 1);
    let output = "";
    for (let item of spineItems) {
      let itemId = item.getAttribute("idref");
      if (!itemId || !hrefById[itemId]) continue;
      let chapterPath = basePath + hrefById[itemId];
      let chapterHtml = await archive.file(chapterPath)?.async("string");
      if (chapterHtml) {
        let chapterDocument = parser.parseFromString(chapterHtml, "text/html");
        chapterDocument.querySelectorAll("script, style, head").forEach(element => element.remove());
        output += (chapterDocument.body.textContent || "").trim() + "\n\n";
      }
    }
    return output.trim();
  } catch (error) {
    console.error("EPUB Parsing Error:", error);
    throw Error(`Lỗi đọc file EPUB: ${error instanceof Error ? error.message : String(error)}`);
  }
};
return { readEpub };
}
