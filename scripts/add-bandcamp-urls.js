'use strict';

const fsp = require('fs').promises;
const glob = require('glob');
const bandcampScraper = require('bandcamp-scraper');

const getManifests = () =>
  new Promise((resolve, reject) => {
    glob('./packages/*/*.gfm.manifest.json', (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(files);
    });
  });

const getAlbumUrls = () =>
  new Promise((resolve, reject) => {
    bandcampScraper.getAlbumUrls(
      'http://alexbainter.bandcamp.com/',
      (err, urls) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(urls);
      }
    );
  });

Promise.all([getManifests(), getAlbumUrls()]).then(
  ([manifestPaths, albumUrls]) => {
    const unmatchedUrls = albumUrls.filter(
      url => !url.includes('corruption-loops')
    );
    const unmatchedIds = [];
    const newManifests = manifestPaths.map(relativePath => {
      const manifest = require(relativePath.replace('./', '../'));
      const { id } = manifest;
      const urlIndex = unmatchedUrls.findIndex(url =>
        url.startsWith(`http://alexbainter.bandcamp.com/album/${id}-excerpts`)
      );
      if (urlIndex === -1) {
        unmatchedIds.push(id);
        return [relativePath, Object.assign({}, manifest)];
      }
      const [url] = unmatchedUrls.splice(urlIndex, 1);
      return [relativePath, Object.assign({}, manifest, { bandcampUrl: url })];
    });
    console.log(unmatchedIds);
    return Promise.all(
      newManifests.map(([relativePath, manifest]) =>
        fsp.writeFile(relativePath, JSON.stringify(manifest, null, 2))
      )
    );
  }
);
