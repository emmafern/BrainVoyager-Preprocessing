/* 	CreateProjects.js 
	Script for BrainVoyager QX 2.2
	By Rainer Goebel 1995-2009
	Modified for BVQX 2.1 by Hester Breman 2009.
	Modified for EmoCapAtt preprocessing by Emma Ferneyhough 2010
*/

var dataDir = "/Volumes/phelpslab/Emma/EmoAttCap_fMRIDATA/fMRI_Data";
var subjectID = "AC110513";
var funcPrfx = ["110513162548","110513163236","110513163851","110513164500","110513165117"];  // hdr file prefix
var funcRuns = ["07","08","09","10","11"];
//var funcRuns = ["07"];
var funcFldrSffx = "+cbi_seg_epi_gre_ME_2000TR";

var fmrNames = ["emoCap_R1","emoCap_R2","emoCap_R3","emoCap_R4","emoCap_R5"];
var nVols = [166, 166, 166, 166, 166];
var tr = [2000, 2000, 2000, 2000, 2000];
var interSliceTime = [58,58,58,58,58];
var skipNVols = 2;
var createPseudoAMR = false;
var nSlices = 34;
var stcPrefix = "untitled-";
var bigEndianByteOrder = true;
//var mosXres = 480;
//var mosYres = 384; 
//var nVolsInMos = 1;
var swapBytes = true;
var nrBytes = 2;
var sliceXres = 80;
var sliceYres = 64;
var sliceThickness = 3;
var gapThickness = 0;
var inplaneRes = 3;

var createFMR = false;
var preprocFMR = true;

var sliceTimeCorrect = false;
var scanOrder = 2;  // First param: Scan order 0 -> Ascending, 1 -> Asc-Interleaved, // 2 -> Asc-Int2, 10 -> Descending, 11 -> Desc-Int, 12 -> Desc-Int2
var interpMeth = 1; // Second param: Interpolation method: 0 -> trilinear, 1 -> cubic spline, 2 -> sinc

var motionCorrect = false;
var targFMRind = 4;  // last FMR (closest to T1)
var targVol = 164;  // last volume of last run (closest to T1)
var interpMethMC = 2; //0 and 1: trilinear detection and trilinear interpo- lation, 2: trilinear detection and sinc interpolation or 3: sinc detection of motion and sinc interpolation.
var useFullData = 0; //true if yes, false if one would like to use the reduced dataset (default in GUI).
var maxIter = 100; //defines for how many iterations the parameters should be fitted. Value in GUI is default ‘100’.
var genMovie = 0;  //Generate movies: true if yes, false if no.
var genLog = 1; //Generate extended log file: true if one would like the motion estimation parameters in a text file, false otherwise

var highPassFilter = false;
var hpfCutoff = 3;
var hpfUnit = "cycles";

var spatialSmooth = false;
var smoothFWHM = 6;
var smoothUnit = "mm";

var makeVTC = true;
var mprageFldr = "12+t1mprage";
var currMPrageDir = dataDir + "/" + subjectID + "/" + mprageFldr;
var IA_trf = "AC110513_emoCap_R5_SCCAI2_3DMCTS_LTR_THP3c-TO-AC110513_orig_IA.trf";
var FA_trf = "AC110513_emoCap_R5_SCCAI2_3DMCTS_LTR_THP3c-TO-AC110513_orig_FA.trf";
var ACPC_trf = "AC110513_orig_ACPC.trf";
var TAL = "AC110513_TAL.tal";
var dataType = 1;// 1: int16, 2: float32
var vtcRes = 3;// one of 1, 2 or 3 mmˆ2
var vtcInterp = 1;
var vtcThresh = 100;

// CREATE FMR
if (createFMR) {
	for (i=0; i < funcRuns.length; i++) {
		var currentRun = dataDir + "/" + subjectID + "/" + funcRuns[i] + funcFldrSffx;
		var currentHdr = currentRun + "/" + funcPrfx[i] + "-001.hdr";
		var newFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + ".fmr";
		var docFMR = BrainVoyagerQX.CreateProjectFMR("ANALYZE", currentHdr, nVols[i], skipNVols, createPseudoAMR, nSlices, stcPrefix, swapBytes, sliceXres, sliceYres, nrBytes, currentRun);
	      docFMR.PixelSizeOfSliceDimX = inplaneRes;
		docFMR.PixelSizeOfSliceDimY = inplaneRes;
		docFMR.SliceThickness = sliceThickness;	
		docFMR.GapThickness = gapThickness;
		docFMR.VoxelResolutionVerified = true;
		docFMR.TR = tr[i];
		docFMR.InterSliceTime = interSliceTime[i];
		docFMR.TimeResolutionVerified = true;
		docFMR.SaveAs(newFMR);
		docFMR.Close();
	}
}

//FMR  P R E P R O C E S S I N G 
if (preprocFMR) {
	for (i=0; i < funcRuns.length; i++) {
		currentRun = dataDir + "/" + subjectID + "/" + funcRuns[i] + funcFldrSffx;

		// SLICE TIME CORRECTION
		if (sliceTimeCorrect) {
			BrainVoyagerQX.TimeOutMessageBox("Slice time correction", 3);
			currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + ".fmr";
			docFMR = BrainVoyagerQX.OpenDocument(currFMR);
			success = docFMR.CorrectSliceTiming(scanOrder,interpMeth); 
			if(!success) return;
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in slice time correction",3);
			preProFMRName = docFMR.FileNameOfPreprocessdFMR; 
			docFMR.Close();
		}

		//MOTION CORRECTION
		if (motionCorrect) {
			if (!sliceTimeCorrect) {
				currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + ".fmr";
			}
			else {
				currFMR = currentRun + "/" + preProFMRName;
			}
			BrainVoyagerQX.TimeOutMessageBox("Motion correction", 3);
			var targFMR = dataDir + "/" + subjectID + "/" + funcRuns[targFMRind] + funcFldrSffx + "/" + subjectID + "_" + fmrNames[targFMRind] + ".fmr";
			BrainVoyagerQX.TimeOutMessageBox(targFMR,3);			
			//currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + ".fmr";
			BrainVoyagerQX.TimeOutMessageBox(currFMR,3);
			docFMR = BrainVoyagerQX.OpenDocument(currFMR);
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in opening currFMR",3);
			success = docFMR.CorrectMotionTargetVolumeInOtherRunEx(targFMR,targVol, interpMethMC, useFullData, maxIter, genMovie, genLog);
			if (!success) return;
			//docFMR.CorrectMotionTargetVolumeInOtherRun(targFMR, targVol);
			//docFMR.CorrectMotion(targVol);
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in motion correction",3);
			preProFMRName = docFMR.FileNameOfPreprocessdFMR;
			docFMR.Close();
		}

		//HIGH PASS FILTERING & LINEAR TREND REMOVAL
		if (highPassFilter) {
			if (!motionCorrect) {
				currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + ".fmr";
			}
			else {
				currFMR = currentRun + "/" + preProFMRName;
			}
			BrainVoyagerQX.TimeOutMessageBox("High pass filter and linear trend removal", 3);
			docFMR = BrainVoyagerQX.OpenDocument(currFMR);
			success = docFMR.TemporalHighPassFilter(hpfCutoff,hpfUnit);
			if (!success) return;
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in HPF & LTR",3);
			preProFMRName = docFMR.FileNameOfPreprocessdFMR;
			docFMR.Close();
		}

		//SPATIAL SMOOTHING
		if (spatialSmooth) {
			if (!highPassFilter) {
				currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + "_SCCAI2_3DMCTS_LTR_THP3c.fmr";
			}
			else {
				currFMR = currentRun + "/" + preProFMRName;
			}
			docFMR = BrainVoyagerQX.OpenDocument(currFMR);
			success = docFMR.SpatialGaussianSmoothing(smoothFWHM, smoothUnit);
			if (!success) return;
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in Spatial Smoothing",3);
			preProFMRName = docFMR.FileNameOfPreprocessdFMR;
			docFMR.Close();
		}

		//MAKING VTCs
		if (makeVTC) { // unsmoothed data
			currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + "_SCCAI2_3DMCTS_LTR_THP3c" + ".fmr";			
			currVTC = currFMR.replace(".fmr",".vtc");
			docFMR = BrainVoyagerQX.OpenDocument(currFMR);
			BrainVoyagerQX.TimeOutMessageBox("VTC Creation", 3);
			success = docFMR.CreateVTCInTALSpace(currFMR, currMPrageDir + "/" + IA_trf, currMPrageDir + "/" + FA_trf, currMPrageDir + "/" + ACPC_trf, currMPrageDir + "/" + TAL, currVTC, dataType, vtcRes, vtcInterp, vtcThresh);
			if (!success) return;			
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in VTC Creation",3);
			docFMR.Close();
		}
		if (makeVTC) { // smoothed data
			currFMR = currentRun + "/" + subjectID + "_" + fmrNames[i] + "_SCCAI2_3DMCTS_LTR_THP3c_SD3DSS6.00mm" + ".fmr";
			currVTC = currFMR.replace(".fmr",".vtc");
			docFMR = BrainVoyagerQX.OpenDocument(currFMR);
			BrainVoyagerQX.TimeOutMessageBox("VTC Creation", 3);
			success = docFMR.CreateVTCInTALSpace(currFMR, currMPrageDir + "/" + IA_trf, currMPrageDir + "/" + FA_trf, currMPrageDir + "/" + ACPC_trf, currMPrageDir + "/" + TAL, currVTC, dataType, vtcRes, vtcInterp, vtcThresh);
			if (!success) return;			
			BrainVoyagerQX.TimeOutMessageBox("Succeeded in VTC Creation",3);
			docFMR.Close();
		}
	}
}