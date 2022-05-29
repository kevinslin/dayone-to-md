/* eslint-disable indent */
/* eslint-disable semi */
/* eslint-disable quotes */
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const formatDate = require("date-fns").format;
const moment = require("moment");
const { ensureDirectoriesExist, writeWithAcc } = require("./utils");

const IMAGE_ROOT = process.env.IMAGE_ROOT;
const NOTE_ROOT = process.env.NOTE_ROOT;


getDayoneFolderPath()
  .then(getDayoneZips)
  .then(unpackDayone)
  .catch((err) => {
    throw new Error(err);
  });

function getDayoneFolderPath() {
  return new Promise((res, reject) => {
    const dayonePath = path.resolve("dayone");

    fs.stat(dayonePath, (err, stat) => {
      if (err || !stat.isDirectory()) {
        return reject("No `dayone` folder found.`");
      }
      return res(dayonePath);
    });
  });
}

function getDayoneZips(dayonePath) {
  return new Promise((res, reject) => {
    fs.readdir(dayonePath, (err, files) => {
      if (err) {
        return reject(err);
      }
      const zipFiles = files.reduce((prev, current) => {
        if (current.indexOf(".zip") === current.length - 4) {
          prev.push(path.join(dayonePath, current));
        }
        return prev;
      }, []);
      if (!zipFiles.length) {
        return reject("No zip files found in `dayone` folder.");
      }
      res(zipFiles);
    });
  });
}

function unpackDayone(zipDirectories) {
  let entriesProcess = 0;

  zipDirectories.map(unpack);

  function unpack(directory) {
    // Make sure the output directories exist
    const entriesDirectory = path.resolve(NOTE_ROOT);
    const photosDirectory = path.resolve("./public/static");
    ensureDirectoriesExist([photosDirectory, entriesDirectory]);

    var zip = new AdmZip(directory);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records

    zipEntries.forEach(function(zipEntry) {

      // Main json file
      if (zipEntry.entryName === "Journal.json") {
        const fullData = JSON.parse(zip.readAsText(zipEntry.entryName));
        const mdEntries = fullData.entries.map(entryToMarkdown);
        if (!mdEntries) {
          return;
        }

        entriesProcess += mdEntries.length;

        saveEntries(mdEntries, entriesDirectory);
      }
      // Photos
      if (zipEntry.entryName.indexOf("photos/") === 0) {
        zip.extractEntryTo(
          /*entry name*/ zipEntry.entryName,
          /*target path*/ photosDirectory,
          /*maintainEntryPath*/ false,
          /*overwrite*/ true
        );
      }
    });
  }

  console.log(`${entriesProcess} entries processed!`);
}

function entryToMarkdown(entry) {
  if (!entry || !entry.text) {
    console.log({ status: "empty", entry });
    return;
  }
  let title = "";
  let text = entry.text.trim();
  if (entry.photos) {
    entry.photos.map((photo) => {
      text = text.replace(
        `dayone-moment://${photo.identifier}`,
        `${IMAGE_ROOT}/${photo.md5}.${photo.type}`
      );
    });
  }

  let formattedEntry = {
    id: entry.uuid,
    date: formatDate(new Date(entry.creationDate), "D MMM, YYYY"),
    title,
    location: entry.location ? entry.location.placeName : "",
    starred: entry.starred,
    tags: entry.tags,
  };

  formattedEntry.md = [getFrontMatter(formattedEntry), text].join("\n\n");

  return formattedEntry;
}

function saveEntries(entries, location) {
  entries
    .filter((entry) => entry !== undefined)
    .map(({ md, date, id }) => {
      const fileDate = moment(date, "D MMM, YYYY").format("YYYY.MM.DD");
      const fname = genFname({date: fileDate, id})
      var saveTo = path.join(location, fname);
      writeWithAcc({path: saveTo, md, addAcc: false})
    });
}

function getFrontMatter(entry) {
  var frontMatter = "---\n";
  for (var prop in entry) {
    if (entry.hasOwnProperty(prop)) {
      let item = entry[prop] || "";
      if (Array.isArray(item)) {
        item = item.join(", ");
      }
      frontMatter = `${frontMatter}${prop}: ${JSON.stringify(item)}\n`;
    }
  }
  return frontMatter + "---";
}

function genFname({date,id}) {
  return `daily.journal.${date}-${id}.md`
}