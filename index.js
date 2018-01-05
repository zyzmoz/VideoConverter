const electron = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const _ = require('lodash');

const { app, BrowserWindow, ipcMain, shell } = electron;

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: { backgroundThrottling: false }
  });
  mainWindow.loadURL(`file://${__dirname}/src/index.html`);
});


ipcMain.on('folder:open', (event, outputPath) => {
  shell.showItemInFolder(outputPath);
});

ipcMain.on('conversion:start', (event, videos) => {
  console.log(videos);
  _.each(videos, video => {
    const outputDir = video.path.split(video.name)[0];
    const outputName = video.name.split('.')[0];
    const outputPath = `${outputDir}${outputName}.${video.format}`;
    ffmpeg(video.path)
      .output(outputPath)
      .on('progress', ({timemark}) => {
        mainWindow.webContents.send('conversion:progress', {video, timemark});
      })
      .on('end', () => {
        mainWindow.webContents.send('conversion:end', {video, outputPath});
      })
      .run();
  });
});

ipcMain.on('videos:added', (event, videos) =>{
  const promises = _.map(videos, video => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(video.path, (err, metadata) => {
        video.duration = metadata.format.duration
        video.format = 'avi';
        resolve(video);//...video get all the properties of the object
      });
    });
  });
  Promise.all(promises)
    .then((results) => {
      console.log(results);
      mainWindow.webContents.send('metadata:complete', results);
    });

  // console.log(videos);
  // const promise = new Promise((resolve, reject) => {
  //   ffmpeg.ffprobe(videos[0].path, (err, metadata) => {
  //     resolve(metadata);
  //   });
  // });
  //
  // promise.then((metadata) => {
  //   console.log(metadata);
  // });
});
