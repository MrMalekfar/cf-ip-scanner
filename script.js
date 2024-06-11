var cfIPv4 = []
var cfIPv4ToScan = []
const noOfEachRange24 = 240
const client = new XMLHttpRequest();
client.open('GET', 'https://raw.githubusercontent.com/MrMalekfar/cf-ip-scanner/main/ipv4.txt');
client.onreadystatechange = function() {
  cfIPv4 = client.responseText.split("\n").map((cidr) => cidr.trim()).filter((cidr) => isCIDR(cidr));
  document.getElementById('btn-start').disabled = false;
  const tbody = document.getElementById('ip-ranges-body');
  cfIPv4.forEach((cidr) => {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.appendChild(document.createTextNode(cidr));
  })
}
client.send();

let maxIP;
let testNo;
let validIPs;
let maxLatency;
let maxdifference;
let numberOfWorkingIPs;
let ipRegex;
let immediateStop = false;
let progressBar = document.getElementById('progress-bar');
let progress = 0;
let language = localStorage.getItem('lang') || 'fa'

document.getElementById('max-ip').value = localStorage.getItem('max-ip') || 50;
document.getElementById('max-latency').value = localStorage.getItem('max-latency') || 400;
document.getElementById('ip-regex').value = localStorage.getItem('ip-regex');
document.getElementById('ip-include').value = localStorage.getItem('ip-include');
document.getElementById('ip-exclude').value = localStorage.getItem('ip-exclude');
setLang(language)

function setLang(lang) {
  if (lang == 'fa') {
    document.getElementById('body').style.direction = 'rtl';
  } else {
    document.getElementById('body').style.direction = 'ltr';
  }
  let elements = document.getElementsByClassName('btn-lang');
  [].forEach.call(elements, (el) => {
    el.classList.remove('btn-primary')
    el.classList.add('btn-outline-primary')
  })
  document.getElementById('btn-' + lang).classList.remove('btn-outline-primary')
  document.getElementById('btn-' + lang).classList.add('btn-primary')
  elements = document.getElementsByClassName('lang-field');
  [].forEach.call(elements, (el) => {
    el.style.display = 'none';
  })
  elements = document.getElementsByClassName('lang-' + lang);
  [].forEach.call(elements, (el) => {
    el.style.display = 'inline';
  })
  localStorage.setItem('lang', lang);
  language = lang;
}

document.getElementById('btn-en').onclick = () => {
  setLang('en')
}
document.getElementById('btn-fa').onclick = () => {
  setLang('fa')
}

function cancelScan() {
  immediateStop = true;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('max-ip').disabled = false;
  document.getElementById('max-latency').disabled = false;
  document.getElementById('ip-regex').disabled = false;
  document.getElementById('ip-include').disabled = false;
  document.getElementById('ip-exclude').disabled = false;
  document.getElementById('btn-cancel').disabled = true;
}

let ips = [];

function startScan() {
  maxIP = ~~document.getElementById('max-ip').value;
  maxLatency = ~~document.getElementById('max-latency').value;
  maxdifference = ~~document.getElementById('max-difference').value;
  ipRegex = document.getElementById('ip-regex').value;
  ipInclude = document.getElementById('ip-include').value;
  ipExclude = document.getElementById('ip-exclude').value;

  localStorage.setItem('max-ip', maxIP);
  localStorage.setItem('max-latency', maxLatency);
  localStorage.setItem('ip-regex', ipRegex);
  localStorage.setItem('ip-include', ipInclude);
  localStorage.setItem('ip-exclude', ipExclude);

  testNo = 0;
  numberOfWorkingIPs = 0;
  validIPs = [];
  document.getElementById('result').innerHTML = '';
  document.getElementById('btn-start').disabled = true;
  document.getElementById('max-ip').disabled = true;
  document.getElementById('max-latency').disabled = true;
  document.getElementById('ip-regex').disabled = true;
  document.getElementById('ip-include').disabled = true;
  document.getElementById('ip-exclude').disabled = true;
  document.getElementById('test-no').innerText = '';
  document.getElementById('btn-cancel').disabled = false;

  setTimeout(() => {
    let ips = processIPs()
    ips = randomizeElements(ips)
    testIPs(ips);
  }, 50)
}

function processIPs() {
  let ips = [];
  let regex = null;
  let excludeRegex = null;
  if (ipRegex) {
    regex = new RegExp(ipRegex);
  }
  if (ipInclude) {
    cfIPv4ToScan = makeCIDR(ipInclude);
  } else {
    cfIPv4ToScan = [...cfIPv4];
  }
  if (ipExclude) {
    excludeRegex = new RegExp(
      ipExclude.split(',').map(c => {return '^' + c.replaceAll('.', '\\.').replaceAll('/', '\\/')}).join('|')
    );
  }

  for (const cidr of cfIPv4ToScan) {
    if (regex && !regex.test(cidr)) {
      continue;
    }
    if (excludeRegex && excludeRegex.test(cidr)) {
      continue;
    }
    ips = ips.concat(cidrToRandomIPArray(cidr));
  }
  return ips
}



async function testIPs(ipList) {
  for (const ip of ipList) {
    if (immediateStop) {
      break;
    }
    testNo++;
    let testResult = 0;
    const url = `https://${ip}:2096/__up`;
    //const url = `https://${ip}:443//cdn-cgi/trace`;
    const startTime = performance.now();
    const controller = new AbortController();
    const multiply = maxLatency <= 500 ? 1.5 : (maxLatency <= 1000 ? 1.2 : 1);
    let timeout = 1.5 * multiply * maxLatency;
    let chNo = 0;
    let MaxofLatencies = 0;
    let MinofLatencies = 0;
    const EachFetchLatency = [];
    let RequestStartTime = 0;
    let failedAttempts = 0;
    let arr_mean = 0;
    let arr_variance = 0;
    for (const ch of ['', '.', '..', '...', '....', '.....', '......', '.......', '........', '.........', '..........',  '...........', '............', '.............', '..............', '...............', '................', '.................', '..................', '...................', '....................',  '.....................',  '......................',  '.......................',  '........................',  '.........................',  '..........................', '...........................', '............................','\\']) {
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {
        RequestStartTime = performance.now();
        const response = await fetch(url, {
          signal: controller.signal,
        });

          testResult++;
      
      } catch (error) {
        if (error.name === "AbortError") {
          //
          failedAttempts++;
        } else {
          testResult++;
        }
      }
    let latency = Math.floor((performance.now() - RequestStartTime));
    EachFetchLatency.push(latency);
    MaxofLatencies = EachFetchLatency.length > 0 ? Math.max(...EachFetchLatency) : 0; // get the maximum latency or -1 if the array is empty
    MinofLatencies = EachFetchLatency.length > 0 ? Math.min(...EachFetchLatency) : 5000; // get the maximum latency or -1 if the array is empty
      if (ch) {
        timeout = 1 * multiply * maxLatency;
        document.getElementById('out-no').innerText = `Working IPs: ${numberOfWorkingIPs}`;
        document.getElementById('test-no').innerText = `Tested IPs: ${testNo}`;
        document.getElementById('ip-no').innerText = ip;
        document.getElementById('ip-no').style = `color: green`;
        document.getElementById('ip-try').innerText = ch;
        document.getElementById('ip-latency').innerText = latency + 'ms';
      } else {
        timeout = 1.2 * multiply * maxLatency;
        document.getElementById('out-no').innerText = `Working IPs: ${numberOfWorkingIPs}`;
        document.getElementById('test-no').innerText = `Tested IPs: ${testNo}`;
        document.getElementById('ip-no').innerText = ip;
        document.getElementById('ip-no').style = `color: red`;
        document.getElementById('ip-try').innerText = '';
        document.getElementById('ip-latency').innerText = '';
      }
      clearTimeout(timeoutId);
      chNo++;
      if (latency > maxLatency) {
      break; // Exit the loop if latency is too high
      }
      if (MinofLatencies < 15) {
      break; // Exit the loop if latency is too high
      }
      if (MaxofLatencies - MinofLatencies > maxdifference) {
      break; // Exit the loop if latency is too high
      }
    }

    if (testResult === 30 && failedAttempts === 0 && MaxofLatencies <= maxLatency) {
      numberOfWorkingIPs++;
      const sum = EachFetchLatency.reduce((a, b) => a + b, 0);
      const mean = sum / EachFetchLatency.length;
      const variance = Math.sqrt(EachFetchLatency.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / EachFetchLatency.length);
      arr_mean = Math.floor(mean);
      arr_variance = Math.floor(variance);
      const ipv6 = ipv4ToIpv6(ip);
      validIPs.push({ip: ip,ipv6: ipv6, latency: MaxofLatencies, numberOfWorkingIPs: numberOfWorkingIPs, arr_variance: arr_variance, arr_mean: arr_mean})
      const sortedArr = validIPs.sort((a, b) => a.latency - b.latency);
      const tableRows = sortedArr.map((obj, index) =>  {
  return `
        <tr>
          <td>${index + 1}</td>
          <td>${obj.ip}</td>
          <td>${obj.ipv6}</td>
          <td>${obj.latency}ms</td>
          <td>${obj.arr_variance}</td>
          <td>${obj.arr_mean}ms</td>
          <td>
          <button class="btn btn-outline-secondary btn-sm" onclick="copyToClipboard('${obj.ip}')"><img height="16px" src="assets/icon-copy.png" /></button>
          </td>
          <td>
          <button class="btn btn-outline-secondary btn-sm" onclick="copyToClipboard('${obj.ipv6}')"><img height="16px" src="assets/icon-copy.png" /></button>
          </td>
        </tr>`}).join('\n');
      document.getElementById('result').innerHTML = tableRows;
    }

    if (numberOfWorkingIPs >= maxIP) {
      break;
    }
  }

  document.getElementById('ip-no').innerText = '';
  document.getElementById('ip-try').innerText = '';
  document.getElementById('ip-latency').innerText = '';
  document.getElementById('btn-start').disabled = false;
  document.getElementById('max-ip').disabled = false;
  document.getElementById('max-latency').disabled = false;
  document.getElementById('ip-regex').disabled = false;
  document.getElementById('ip-include').disabled = false;
  document.getElementById('ip-exclude').disabled = false;
  document.getElementById('btn-cancel').disabled = true;

  if (immediateStop) {
    immediateStop = false;
    document.getElementById('test-no').innerHTML = `
      <span class="lang-field lang-fa text-danger fw-bold">لغو شد!</span>
      <span class="lang-field lang-en text-danger fw-bold">Canceled!</span>  
    `;
  } else {
    if (window.self !== window.top) {
      copyAllToClipboard()
      window.top.postMessage(validIPs.map(el => el.ip).join('\n'), '*');
    }

    document.getElementById('test-no').innerHTML = `
      <span class="lang-field lang-fa text-success fw-bold">تمام شد.</span>
      <span class="lang-field lang-en text-success fw-bold">Done.</span>  
    `;
  }
  setLang(language)
}
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })

function copyToClipboard(ip) {
  navigator.clipboard.writeText(ip).then(() => {
    alert('آی‌پی‌ در کلیپ‌بورد کپی شد.');
  }).catch(() => {
    alert('مشکلی پیش آمده است!');
  });
}

function copyAllToClipboard(ip) {
  const txt = validIPs.map(el => el.ip).join('\n');
  copyToClipboard(txt)
}

function copyAllIPv6ToClipboard(ip) {
  const txt = validIPs.map(el => el.ipv6).join('\n');
  copyToClipboard(txt)
}

function isCIDR(cidr) {
  return cidr.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/(16|17|18|19|20|21|22|23|24)$/g);
}

function makeCIDR(includeStr) {
  let includeList = includeStr.split(',').map((cidr) => cidr.trim());
  cidrList = includeList.flatMap((cidr) => {
    if (isCIDR(cidr)) {
      return [cidr];
    } else if (cidr) {
      const regex = new RegExp(
        '^' + cidr.replaceAll('.', '\\.').replaceAll('/', '\\/')
      );
      return cfIPv4.filter((cidr) => cidr.match(regex));
    } else {
      return [];
    }
  })
  return cidrList;
}

function generateRandomNumbers(count) {
  const numbers = [];
  while (numbers.length < count) {
    const randomNumber = Math.floor(Math.random() * 254) + 1;
    if (!numbers.includes(randomNumber)) {
      numbers.push(randomNumber);
    }
  }
  return numbers;
}

function splitCIDRTo24Ranges(cidr) {
  const [baseIP, baseMask] = cidr.split('/');
  const baseStart = baseIP.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
  const baseEnd = (baseStart | (0xffffffff >>> parseInt(baseMask, 10))) >>> 0;

  const ranges = [];
  let currentStart = baseStart;

  while (currentStart <= baseEnd) {
    ranges.push(currentStart);
    currentStart += 0x100;
  }

  return ranges
}


function cidrToRandomIPArray(cidr, count) {
  const ranges = splitCIDRTo24Ranges(cidr);
  const ips = [];
  for (const start of ranges) {
    const prefix = `${(start >>> 24) & 0xff}.${(start >>> 16) & 0xff}.${(start >>> 8) & 0xff}`;
    for (const no of generateRandomNumbers(noOfEachRange24)) {
      ips.push(prefix + '.' + no);
    }
  }
  return ips;
}

function randomizeElements(arr) {
  return [...arr].sort(() => {return 0.5 - Math.random()});
}

function downloadAsCSV() {
  const csvString = validIPs.map(el => el.ip).join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ip-list.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadIPv6AsCSV() {
  const csvString = validIPs.map(el => el.ipv6).join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ip-list.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAsJSON() {
  const jsonString = JSON.stringify(validIPs.map(el => el.ip), null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ip-list.json');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadIPv6AsJSON() {
  const jsonString = JSON.stringify(validIPs.map(el =>  '[' + el.ipv6 + ']'), null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ip-list.json');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ipv4ToIpv6(ip) {
  const ipv6Prefix = "::FFFF:";
  const ipv6Suffix = ip.split(".").map((octet) => {
    const hexOctet = parseInt(octet, 10).toString(16);
    return hexOctet.padStart(2, "0");
  }).join("");
  const ipv6Address = ipv6Prefix + ipv6Suffix.toUpperCase().match(/.{1,4}/g).join(":");
  return ipv6Address;
}
