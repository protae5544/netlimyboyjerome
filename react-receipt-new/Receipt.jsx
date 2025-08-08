// Receipt.jsx - React Component สำหรับใบเสร็จรับเงิน
const Receipt = () => {
  // State สำหรับเก็บข้อมูลแรงงาน
  const [allWorkerData, setAllWorkerData] = React.useState([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  
  // ฟังก์ชันสำหรับเซ็ต URL ของภาพ
  const setImageSrc = (imgElementId, src, defaultSrc, workerName, type) => {
    const imgElement = document.getElementById(imgElementId);
    if (!imgElement) {
      console.error(`Image element with ID "${imgElementId}" not found.`);
      return;
    }
    
    console.log(`Setting ${type} image for ${workerName || 'N/A'}`);
    if (src && src.trim() !== '') {
      imgElement.crossOrigin = "anonymous";
      const testImage = new Image();
      testImage.crossOrigin = "anonymous";
      testImage.onload = function() {
        console.log(`Successfully loaded ${type} image:`, src);
        imgElement.src = src;
      };
      testImage.onerror = function() {
        console.warn(`Failed to load ${type} image from "${src}" for ${workerName || 'N/A'}, using fallback.`);
        imgElement.src = defaultSrc;
      };
      testImage.src = src;
    } else {
      console.warn(`${type} image URL is empty for ${workerName || 'N/A'}, using fallback.`);
      imgElement.src = defaultSrc;
    }
  };
  
  // ฟังก์ชันรับวันเวลาปัจจุบัน
  const getCurrentTimestamp = () => {
    const now = new Date();
    const thaiDate = now.toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', ' น.');
    return thaiDate;
  };
  
  // โหลดข้อมูลแรงงานจาก JSON
  const loadWorkerData = () => {
    setLoading(true);
    
    const urlParams = new URLSearchParams(window.location.search);
    const requestNumberFromUrl = urlParams.get('id');
    
    fetch('../combined-data.json')
      .then(response => {
        console.log("Response status:", response.status);
        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          throw new Error('Failed to load combined-data.json or file does not exist.');
        }
        return response.json();
      })
      .then(data => {
        console.log("Data loaded successfully, record count:", data.length);
        if (data.length > 0) console.log("First record sample:", data[0]);
        
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Data in combined-data.json is empty or not a valid array.');
        }
        
        setAllWorkerData(data);
        
        if (requestNumberFromUrl) {
          console.log("Searching for ID from URL parameter:", requestNumberFromUrl);
          const index = data.findIndex(w => w.requestNumber && w.requestNumber.toString() === requestNumberFromUrl.toString());
          
          if (index === -1) {
            setCurrentIndex(0);
            console.warn(`Worker with request number "${requestNumberFromUrl}" not found. Displaying the first worker instead.`);
          } else {
            setCurrentIndex(index);
            console.log("Worker found at index:", index);
          }
        } else {
          setCurrentIndex(0);
          console.log("No ID in URL parameter, displaying the first worker.");
        }
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading JSON:', error);
        setError(error.message);
        setLoading(false);
      });
  };
  
  // แสดงข้อมูลแรงงานจาก index ที่กำหนด
  const displayWorkerData = (index) => {
    if (index < 0 || index >= allWorkerData.length) {
      console.error(`Index out of bounds: ${index}`);
      return;
    }
    
    const worker = allWorkerData[index];
    console.log("Displaying worker data for index:", index, worker);

    // Receipt Data
    document.getElementById('requestNumberReceipt').innerHTML = worker.requestNumber || 'N/A';
    document.getElementById('receiptNumberReceipt').innerHTML = worker.receiptNumber || 'N/A';
    document.getElementById('paymentNumberReceipt').innerHTML = worker.paymentNumber || 'N/A';
    document.getElementById('payerNameReceipt').innerHTML = worker.englishName || worker.thaiName || 'N/A';
    document.getElementById('nationalityReceipt').innerHTML = worker.nationality || 'N/A';
    document.getElementById('alienReferenceReceipt').innerHTML = worker.alienReferenceNumber || 'N/A';
    document.getElementById('personalIDReceipt').innerHTML = worker.personalID || 'N/A';

    // QR Codes
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
    const workerPageUrl = `${baseUrl}worker.html?id=${encodeURIComponent(worker.requestNumber || '')}`;
    // ชี้ QR ไปยัง Netlify Function ที่สร้าง PDF ฝั่งเซิร์ฟเวอร์ (Pixel Perfect)
    const currentDomain = window.location.origin;
    const receiptUrl = `${currentDomain}/.netlify/functions/pdf?requestNumber=${encodeURIComponent(worker.requestNumber || '')}&personalID=${encodeURIComponent(worker.personalID || '')}`;
    const receiptQrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(receiptUrl)}`;
    const defaultQrCodeSrc = 'https://via.placeholder.com/90?text=No+QR';
    setImageSrc('receiptQrCode', receiptQrCodeApiUrl, defaultQrCodeSrc, worker.englishName, 'receipt QR code');

    // Timestamps
    const timestamp = getCurrentTimestamp();
    const receiptTimestamp = `เอกสารอิเล็กทรอนิกส์ฉบับนี้ถูกสร้างจากระบบอนุญาตทำงานคนต่างด้าวที่มีสถานะการทำงานไม่ถูกต้องตามกฎหมาย ตามมติคณะรัฐมนตรีเมื่อวันที่ 24 กันยายน 2567<br/>โดยกรมการจัดหางาน กระทรวงแรงงาน<br/>พิมพ์เอกสาร วันที่ ${timestamp}`;
    document.getElementById('receiptTimestamp').innerHTML = receiptTimestamp;
  };
  
  // Effect สำหรับโหลดข้อมูลเมื่อ component ถูกโหลด
  React.useEffect(() => {
    loadWorkerData();
  }, []);
  
  // Effect สำหรับแสดงข้อมูลเมื่อ currentIndex หรือ allWorkerData เปลี่ยน
  React.useEffect(() => {
    if (allWorkerData.length > 0 && !loading) {
      displayWorkerData(currentIndex);
    }
  }, [currentIndex, allWorkerData, loading]);

  // แสดงแรงงานก่อนหน้า
  const showPreviousWorker = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      alert('This is the first record.');
    }
  };

  // แสดงแรงงานถัดไป
  const showNextWorker = () => {
    if (currentIndex < allWorkerData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert('This is the last record.');
    }
  };
  
  // จัดการเมื่อมีการเปลี่ยนค่าใน dropdown
  const handleWorkerChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue !== 'all') {
      setCurrentIndex(parseInt(selectedValue));
    }
  };

  // ดาวน์โหลด PDF (ผ่าน Netlify Function เพื่อความ Pixel Perfect)
  const downloadPDF = async (workerItem, filenameSuffix = '') => {
    try {
      const filename = `${workerItem.requestNumber || 'worker'}${filenameSuffix}.pdf`;
      
      // Hide controls during PDF generation
      const controls = document.querySelector('.controls-container');
      if (controls) controls.style.display = 'none';
      
      // เรียก Netlify Function เพื่อสร้าง PDF ฝั่งเซิร์ฟเวอร์
      const currentDomain = window.location.origin;
      const url = `${currentDomain}/.netlify/functions/pdf?requestNumber=${encodeURIComponent(workerItem.requestNumber || '')}&personalID=${encodeURIComponent(workerItem.personalID || '')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      
      // ไม่มีการเปลี่ยนแปลง DOM สำหรับเซิร์ฟเวอร์ไซด์แล้ว
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ดาวน์โหลด PDF สำหรับแรงงานปัจจุบัน
  const downloadCurrentPDF = async () => {
    await downloadPDF(allWorkerData[currentIndex]);
  };
  
  // ดาวน์โหลด PDF ทั้งหมด
  const downloadAllPDFs = async () => {
    const selectedValue = document.getElementById('workerDropdown').value;
    
    if (selectedValue === 'all') {
      const confirmDownload = confirm(`กำลังจะดาวน์โหลด PDF ทั้งหมด ${allWorkerData.length} ไฟล์ ต้องการดำเนินการต่อหรือไม่?`);
      
      if (!confirmDownload) return;
      
      alert(`เตรียมดาวน์โหลด ${allWorkerData.length} ไฟล์ PDF กรุณารอสักครู่...`);
      
      for (let i = 0; i < allWorkerData.length; i++) {
        try {
          displayWorkerData(i);
          console.log(`Downloading PDF ${i + 1} of ${allWorkerData.length}: ${allWorkerData[i].requestNumber}`);
          await downloadPDF(allWorkerData[i], `_batch_${i+1}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between downloads
        } catch (error) {
          console.error(`Error downloading PDF for worker ${i + 1}:`, error);
          continue; // Continue with next worker even if one fails
        }
      }
      
      alert('การดาวน์โหลด PDF ทั้งหมดเสร็จสิ้น');
      
      // Restore original data
      if (currentIndex >= 0 && currentIndex < allWorkerData.length) {
        displayWorkerData(currentIndex);
      } else if (allWorkerData.length > 0) {
        displayWorkerData(0);
      }
    } else {
      await downloadPDF(allWorkerData[currentIndex]);
    }
  };

  return (
    <div className="bg-gray-500">
      {/* Controls Container */}
      <div className="controls-container fixed top-4 right-4 bg-white/30 p-4 rounded-md shadow-lg z-[1000] w-[280px]">
        <select
          id="workerDropdown"
          onChange={handleWorkerChange}
          className="w-full my-2 px-3 py-2 rounded border border-gray-300 font-['THSarabunPSK'] text-base"
        >
          <option value="all">เลือกแรงงาน (ทั้งหมด)</option>
          {allWorkerData.map((worker, index) => (
            <option key={index} value={index}>
              {worker.requestNumber || 'N/A'} - {worker.thaiName || worker.englishName || 'N/A'}
            </option>
          ))}
        </select>
        <button
          onClick={downloadCurrentPDF}
          className="w-full my-1 px-3 py-2 rounded bg-green-500 text-white font-['THSarabunPSK'] text-base hover:bg-green-600 transition-colors"
        >
          ดาวน์โหลด PDF ปัจจุบัน
        </button>
        <button
          onClick={downloadAllPDFs}
          className="w-full my-1 px-3 py-2 rounded bg-green-500 text-white font-['THSarabunPSK'] text-base hover:bg-green-600 transition-colors"
        >
          ดาวน์โหลด PDF (ตามที่เลือก)
        </button>
        <button
          onClick={showPreviousWorker}
          className="w-1/2 my-1 mr-1 px-3 py-2 rounded bg-blue-500 text-white font-['THSarabunPSK'] text-base hover:bg-blue-600 transition-colors"
        >
          ก่อนหน้า
        </button>
        <button
          onClick={showNextWorker}
          className="w-1/2 my-1 ml-1 px-3 py-2 rounded bg-blue-500 text-white font-['THSarabunPSK'] text-base hover:bg-blue-600 transition-colors"
        >
          ถัดไป
        </button>
      </div>

      {/* Page 2: Receipt */}
      <div id="page2-div" className="page-div relative w-[892px] h-[1261px] font-['THSarabunPSK'] text-black mx-auto bg-white">
        <img width="892" height="1261" src="../bg2.svg" alt="receipt background image"/>
        
        {/* Receipt QR Code */}
        <img className="absolute top-[925px] left-[120px] w-[90px] h-[90px] object-cover" id="receiptQrCode" src="https://via.placeholder.com/90?text=Loading" alt="Receipt QR Code"/>
        
        {/* Department Info */}
        <p style={{position:'absolute',top:147,left:86,whiteSpace:'nowrap'}} className="ft00">กรมการจัดหางาน</p>
        <p style={{position:'absolute',top:170,left:88,whiteSpace:'nowrap'}} className="ft00">กระทรวงแรงงาน</p>
        
        {/* Receipt Header */}
        <p style={{position:'absolute',top:90,left:397,whiteSpace:'nowrap'}} className="ft01"><b>ใบเสร็จรับเงิน</b></p>
        <p style={{position:'absolute',top:120,left:418,whiteSpace:'nowrap'}} className="ft01"><b>ต้นฉบับ</b></p>
        
        {/* Receipt Number */}
        <p style={{position:'absolute',top:60,left:598,whiteSpace:'nowrap'}} className="ft00">เลขที่</p>
        <p style={{position:'absolute',top:60,left:640,whiteSpace:'nowrap'}} className="ft00" id="receiptNumberReceipt">xxxxxxx</p>
        
        {/* Office and Date */}
        <p style={{position:'absolute',top:149,left:582,whiteSpace:'nowrap'}} className="ft00">ที่ทำการ&#160;&#160; สำนักบริหารแรงงานต่างด้าว</p>
        <p style={{position:'absolute',top:188,left:602,whiteSpace:'nowrap'}} className="ft00">วันที่&#160;&#160; 19 มีนาคม 2568</p>
        
        {/* Payment Number */}
        <p style={{position:'absolute',top:227,left:540,whiteSpace:'nowrap'}} className="ft00">เลขที่ใบชำระเงิน&#160;&#160;</p>
        <p style={{position:'absolute',top:227,left:640,whiteSpace:'nowrap'}} className="ft00" id="paymentNumberReceipt">IV680329/002308</p>
        
        {/* Payer Information */}
        <p style={{position:'absolute',top:271,left:60,whiteSpace:'nowrap'}} className="ft00">เลขรับคำขอที่</p>
        <p style={{position:'absolute',top:271,left:180,whiteSpace:'nowrap'}} className="ft00" id="requestNumberReceipt">xxxxxxx</p>
        <p style={{position:'absolute',top:310,left:60,whiteSpace:'nowrap'}} className="ft00">ชื่อผู้ชำระเงิน</p>
        <p style={{position:'absolute',top:310,left:180,whiteSpace:'nowrap'}} className="ft00" id="payerNameReceipt">xxxxxxxxxxxxx</p>
        <p style={{position:'absolute',top:310,left:471,whiteSpace:'nowrap'}} className="ft00">สัญชาติ</p>
        <p style={{position:'absolute',top:310,left:520,whiteSpace:'nowrap'}} className="ft00" id="nationalityReceipt">เมียนมา</p>
        <p style={{position:'absolute',top:354,left:60,whiteSpace:'nowrap'}} className="ft00">เลขอ้างอิงคนต่างด้าว</p>
        <p style={{position:'absolute',top:354,left:180,whiteSpace:'nowrap'}} className="ft00" id="alienReferenceReceipt">xxxxxxxxxxxxx</p>
        <p style={{position:'absolute',top:354,left:432,whiteSpace:'nowrap'}} className="ft00">หมายเลขประจำตัวคนต่างด้าว</p>
        <p style={{position:'absolute',top:354,left:640,whiteSpace:'nowrap'}} className="ft00" id="personalIDReceipt">xxxxxxxxxxxxx</p>
        
        {/* Employer Information */}
        <p style={{position:'absolute',top:399,left:60,whiteSpace:'nowrap'}} className="ft00">ชื่อนายจ้าง / สถานประกอบการ&#160;&#160; บริษัท บาน กง เอ็นจิเนียริ่ง จำกัด</p>
        <p style={{position:'absolute',top:438,left:60,whiteSpace:'nowrap'}} className="ft00">เลขประจำตัวนายจ้าง</p>
        <p style={{position:'absolute',top:437,left:233,whiteSpace:'nowrap'}} className="ft00">&#160; 0415567000061</p>
        
        {/* Items Header */}
        <p style={{position:'absolute',top:526,left:345,whiteSpace:'nowrap'}} className="ft02"><b>รายการ</b></p>
        <p style={{position:'absolute',top:526,left:688,whiteSpace:'nowrap'}} className="ft02"><b>จำนวนเงิน</b></p>
        
        {/* Fee Items */}
        <p style={{position:'absolute',top:572,left:118,whiteSpace:'nowrap'}} className="ft03">1. ค่าธรรมเนียมในการยื่นคำขอ ฉบับละ 100 บาท</p>
        <p style={{position:'absolute',top:572,left:736,whiteSpace:'nowrap'}} className="ft03">100.00</p>
        <p style={{position:'absolute',top:616,left:118,whiteSpace:'nowrap'}} className="ft03">2. ค่าธรรมเนียมใบอนุญาตทำงาน</p>
        <p style={{position:'absolute',top:616,left:736,whiteSpace:'nowrap'}} className="ft03">900.00</p>
        
        {/* Empty rows */}
        <p style={{position:'absolute',top:694,left:97,whiteSpace:'nowrap'}} className="ft03">&#160;</p>
        <p style={{position:'absolute',top:694,left:648,whiteSpace:'nowrap'}} className="ft03">&#160;</p>
        
        {/* Total */}
        <p style={{position:'absolute',top:772,left:174,whiteSpace:'nowrap'}} className="ft02"><b>รวมเป็นเงินทั้งสิ้น (บาท)</b></p>
        <p style={{position:'absolute',top:799,left:188,whiteSpace:'nowrap'}} className="ft02"><b>( หนึ่งพันบาทถ้วน )</b></p>
        <p style={{position:'absolute',top:786,left:385,whiteSpace:'nowrap'}} className="ft03">&#160;</p>
        <p style={{position:'absolute',top:774,left:722,whiteSpace:'nowrap'}} className="ft02"><b>1,000.00</b></p>
        
        {/* Receipt Confirmation */}
        <p style={{position:'absolute',top:894,left:94,whiteSpace:'nowrap'}} className="ft00">ไดี่รับเงินไวี่เปินการถูกต้องแล้ว</p>
        
        {/* Signature */}
        <p style={{position:'absolute',top:977,left:481,whiteSpace:'nowrap'}} className="ft00">(ลงชื่อ)</p>
        <p style={{position:'absolute',top:977,left:564,whiteSpace:'nowrap'}} className="ft00">นางสาวอารีวรรณ โพธิ์นิ่มแดง</p>
        <p style={{position:'absolute',top:977,left:762,whiteSpace:'nowrap'}} className="ft00">(ผู้รับเงิน)</p>
        
        {/* Position */}
        <p style={{position:'absolute',top:1017,left:473,whiteSpace:'nowrap'}} className="ft00">ตำแหน่ง</p>
        <p style={{position:'absolute',top:1016,left:562,whiteSpace:'nowrap'}} className="ft00">นักวิชาการแรงงานชำนาญการ</p>
        
        {/* Receipt Timestamp */}
        <p style={{position:'absolute',top:1133,left:55,whiteSpace:'nowrap'}} className="ft06" id="receiptTimestamp">เอกสารอิเล็กทรอนิกส์ฉบับนี้ถูกสร้างจากระบบอนุญาตทำงานคนต่างด้าวที่มีสถานะการทำงานไม่ถูกต้องตามกฎหมาย ตามมติคณะรัฐมนตรีเมื่อวันที่ 24 กันยายน 2567<br/>โดยกรมการจัดหางาน กระทรวงแรงงาน<br/>พิมพ์เอกสาร วันที่ </p>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white p-5 rounded-md shadow-lg">
            <div className="animate-spin mb-3 h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-lg">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white p-5 rounded-md shadow-lg max-w-md">
            <h2 className="text-xl text-red-500 mb-3">เกิดข้อผิดพลาด</h2>
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => setError('')} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
