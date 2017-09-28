const svnUltimate = require('node-svn-ultimate');
const ProgressBar = require('progress');
const fs = require('fs');

const config = require('./config/config.js');
const ask = require('./lib/ask');

const encodingType = 'utf8';
const options = {
  username: config.id,
  password: config.pw
}

var commitMessage = '';
var splitData = [];
var targetData = [];
var answer = 'Y';


//checkout용 progress-bar
var bar = new ProgressBar('First of all, you have to checkout repository: :bar', {
      complete: '.'
    , incomplete: ' '
    , total: 250
  });


//initFlag파일 읽기. 최초에는 true값이, 이후에는 false값이 들어온다.
let getInitStatus = (filePath, tyoe) => {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, tyoe, function(error, data){
			if(error) reject(error);
			console.log('Don\'t you have repository? ' + data);
			(data==="true")? resolve(true): resolve(false);
		});
	});
};

//initFlag파일에 대해 message값으로 수정한다. 최초수행시 true값을 false로 수정하여 체크아웃등을 미연에 방지한다.
let setInitStatus = (filePath, message, tyoe) => {
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, message, tyoe, function(error){
			if(error) reject(error);
			console.log('I\'ll Change your initialize status value. => ' + message);
			resolve();
		});
	});
};

//svn checkout. svn경로와 받을 디렉토리를 정의해준다. (최초에 레포지토리 없는 경우에만 수행할 것)
let getSourceCheckOut = () => {
	return new Promise((resolve, reject) => {
		svnUltimate.commands.checkout( config.url, config.repo, function(error) {
			if(error) reject(error);
		  console.log('Checkout finished.');
		  resolve();
		});
	})
};

//svn cleanup
let cleanUp = () => {
	return new Promise((resolve, reject) => {
		svnUltimate.commands.cleanup( config.repo, options, function(error){
			if(error) reject(error);
			console.log('CleanUp finished.');
			resolve();
		});
	});
};

//svn update to head
let updateToHead = () => {
	return new Promise((resolve, reject) => {
		svnUltimate.commands.update( config.repo, options, function(error) {
			if(error) reject(error);
		  console.log( "Update finished." );
		  resolve();
		});
	});
};

let getFileContents = () => {
	return new Promise((resolve, reject) => {
		fs.readFile( config.source, encodingType, function(error, data){
			if(error) reject(error);
			console.log('First, I\'ll check your source file list.');
			resolve(data);
		});
	})
}

//svn merge source
let merge = () => {
	let tempData = splitData[0].split('/').join('\\');
	let targetURL = config.repo + '\\' + tempData;
	let option = {
	  params: [targetURL]
	}
	return new Promise((resolve, reject) => {
		svnUltimate.commands.merge( targetData, option, function(error) {
			if(error) reject(error);
		  console.log( "Merge finished." );
		  resolve();
		});
	});
};

//initFlag값에 따라 checkout을 받고 안받고 결정한다. 추후에는 레포지토리 디렉토리 검사로 변경할 것
async function initFlagProcess(){
	let initFlag = await getInitStatus('./config/initFlag', encodingType);

	if(initFlag){
		let timer = setInterval(function(){
			bar.tick();
		  if (bar.complete) {
		    console.log('\nalmost done. wait for it.\n');
		    clearInterval(timer);
		  }
		}, 1500);
		await setInitStatus('./config/initFlag', 'false', encodingType);
		await getSourceCheckOut();

	}

	await cleanUp();
}

async function updateProcess(){
	await updateToHead();
}

async function readFileContents(){
	let data = await getFileContents();
	console.log('\n' + data + '\n-------------------------------------------------------------------');
	answer = await ask.readLine('Is this right your merge source list? (Y/N)');
	if(answer === 'Y' || answer === 'y'){
		splitData = data.split('\n');
		commitMessage = splitData[0];
		splitData = splitData.slice(1);

		for(let i=0; i<splitData.length; i++){
			targetData[i] = config.trunkUrl + splitData[i];
			console.log(splitData[i]);
		}
	} else{
		return;
	}

}

async function mergeProcess(){
	await merge();
}


//메인함수
var next = initFlagProcess().then(() => {
	console.log('Initialize job is done. Let\'s do update to head in your repository.');
});

next.then(() => {
	updateProcess().then(() => {
		console.log('Update job is done. Let\'s do merge job. Are you ready?');
		return true;
	}).then(() => {
		readFileContents().then(() => {
			mergeProcess();
		}).then(() => {
			console.log('Merge job is done.')
		});
	});;
});


next.then(() => {

});
