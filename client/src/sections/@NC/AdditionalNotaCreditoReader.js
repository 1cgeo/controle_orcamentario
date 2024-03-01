import * as React from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useFormik } from 'formik';
import * as yup from 'yup';
import TextField from '@mui/material/TextField';
import { useSnackbar } from 'notistack';
import LoadingButton from '@mui/lab/LoadingButton';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import { useAPI } from '../../contexts/apiContext'


const pdfContentType = 'application/pdf';

const validationSchema = yup.object({
  tipo_credito_id: yup.number()
    .required('Preencha'),
  numero: yup.string()
    .required('Preencha'),
  data: yup.string()
    .required('Preencha'),
  descricao: yup.string()
    .required('Preencha'),
  nd: yup.string()
    .required('Preencha'),
  pi: yup.string()
    .required('Preencha'),
  valor: yup.number()
    .required('Preencha')
});


export default function AdditionalNotaCreditoReader({
  onClose,
  selectedCreditNote
}) {

  const {
    createAdditionalNotaCredito
  } = useAPI()

  const { enqueueSnackbar } = useSnackbar();

  const showSnackbar = (message, variant) => {
    // variant could be success, error, warning, info, or default
    enqueueSnackbar(message, { variant });
  };

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar: (Toolbar) => (
      <Toolbar>
        {(slots) => {
          const {
            CurrentPageInput,
            Download,
            EnterFullScreen,
            GoToNextPage,
            GoToPreviousPage,
            NumberOfPages,
            Print,
            ShowSearchPopover,
            Zoom,
            ZoomIn,
            ZoomOut,
          } = slots;
          return (
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                width: '100%',
              }}
            >
              <div style={{ padding: '0px 2px' }}>
                <ShowSearchPopover />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <ZoomOut />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <Zoom />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <ZoomIn />
              </div>
              <div style={{ padding: '0px 2px', marginLeft: 'auto' }}>
                <GoToPreviousPage />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <CurrentPageInput />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <GoToNextPage />
              </div>
              <div style={{ padding: '0px 2px', marginLeft: 'auto' }}>
                <EnterFullScreen />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <Download />
              </div>
              <div style={{ padding: '0px 2px' }}>
                <Print />
              </div>
            </div>
          );
        }}
      </Toolbar>
    )
  });


  const uploadInputRef = React.useRef(null);

  const [currentPDF, setCurrentPDF] = React.useState(null)
  const [currentPDFFile, setCurrentPDFFile] = React.useState(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [loadingPDF, setLoadingPDF] = React.useState(false)

  const base64toBlob = (data) => {
    // Cut the prefix `data:application/pdf;base64` from the raw base 64
    const base64WithoutPrefix = data.substr(`data:${pdfContentType};base64,`.length);

    const bytes = atob(base64WithoutPrefix);
    let length = bytes.length;
    let out = new Uint8Array(length);

    while (length--) {
      out[length] = bytes.charCodeAt(length);
    }

    return new Blob([out], { type: pdfContentType });
  };

  const handleCreate = async (values, { resetForm }) => {
    setSubmitting(true);
    try {
      const data = await createAdditionalNotaCredito(
        {
          ...values,
          credito_base_id: selectedCreditNote.id
        },
        currentPDFFile
      )
      if (data?.error) {
        showSnackbar(data.error.response.data.message, 'error')
        return
      }
      showSnackbar("Criado com sucesso.", "success");
      onClose()
    } catch (error) {
      console.log(error)
      showSnackbar(error.message, 'error')
    } finally {
      setSubmitting(false);
    }
  }

  const getFieldLabel = (field) => {
    return {
      numero: "Número",
      data: "Data",
      descricao: "Descrição",
      nd: "ND",
      pi: "PI",
      valor: "Valor"
    }[field]
  }

  const formik = useFormik({
    initialValues: {
      numero: "",
      data: "",
      descricao: "",
      nd: "",
      pi: "",
      valor: "",
      tipo_credito_id: 2
    },
    validationSchema: validationSchema,
    onSubmit: handleCreate
  });

  const extractTextPDF = () => {
    var pdf = pdfjsLib.getDocument(currentPDF);

    pdf.promise.then(async (pdf) => {
      let maxPages = pdf.numPages;
      let page = await pdf.getPage(1);
      let textContent = await page.getTextContent()
      let text = textContent.items
        .map(function (s) {
          return s.str;
        })
        .join('')
      const data = text.match(/[0-9]{2}\/[0-9]{2}\/[0-9]{2}/g)[0]
      const numero = text.match(/(?<=NUMERO :\s+).*?(?=UG )/g)[0]
      const descricao = text.match(/(?<=CGEOOBSERVACAO+).*?(?=NUM.)/g)[0]
      const [, , , , ND, , PI, value] = String(text.match(/(?<=V A L O R+).*?(?=LANCADO POR)/g)).split(' ')
      formik.setFieldValue("data", data);
      formik.setFieldValue("numero", numero);
      formik.setFieldValue("descricao", descricao);
      formik.setFieldValue("nd", ND);
      formik.setFieldValue("pi", PI);
      formik.setFieldValue("valor", Number(value.replace('.', '').replace(',', '.')));


    })


  }

  React.useEffect(() => {
    const elem = document.getElementById("inputFile");
    elem.addEventListener("change", (event) => {
      setLoadingPDF(true)
      //Read File
      var selectedFile = document.getElementById("inputFile").files;
      //Check File is not Empty
      if (selectedFile.length > 0) {
        // Select the very first file from list
        var fileToLoad = selectedFile[0];
        setCurrentPDFFile(fileToLoad)
        // FileReader function for read the file.
        var fileReader = new FileReader();
        var base64;
        // Onload of file read the file content
        fileReader.onload = function (fileLoadedEvent) {
          base64 = fileLoadedEvent.target.result;
          // Print data in console
          setCurrentPDF(URL.createObjectURL(base64toBlob(base64)))
        };
        // Convert data to base64
        fileReader.readAsDataURL(fileToLoad);
      }
      setLoadingPDF(false)
    });

  }, [])

  React.useEffect(() => {
    if (currentPDF == null) return
    extractTextPDF(currentPDF)
  }, [currentPDF])


  return (
    <Box
      sx={{
        padding: '12px',
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        gap: 2
      }}
    >
      <Box
      >
        <Box
          sx={{
            minWidth: '50vw',
            height: '80vh'
          }}
        >
          {
            currentPDF &&
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.js">
              <Viewer
                fileUrl={currentPDF}
                plugins={[defaultLayoutPluginInstance]}
              />
            </Worker>
          }

        </Box>
        <Box>
          <input
            ref={uploadInputRef}
            id="inputFile"
            type="file"
            accept='application/pdf'
            style={{ display: "none" }}
            name="file"
          />
          <LoadingButton
            onClick={() => uploadInputRef.current && uploadInputRef.current.click()}
            variant="contained"
            loading={loadingPDF}
            disabled={submitting}
          >
            Selecionar PDF
          </LoadingButton>
        </Box>
      </Box>

      <Box>
        <form onSubmit={formik.handleSubmit}>
          <Box
            sx={{
              display: 'flex',
              width: '500px',
              flexDirection: 'column',
              paddingRight: 1.7,
              '& > :not(style)': {
                m: 1
              },
            }}
          >
            {
              Object.keys(validationSchema.fields).map(n => {
                if (n == 'tipo_credito_id') {
                  return (
                    <Box
                      sx={{
                        width: '100%'
                      }}
                      key={n}>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        fullWidth
                        id={n}
                        name={n}
                        value={formik.values[n]}
                        onChange={formik.handleChange}
                        error={formik.touched[n] && Boolean(formik.errors[n])}
                      //helperText={formik.touched[n] && formik.errors[n]}
                      >
                        <MenuItem value={2}>Reforço </MenuItem>
                        <MenuItem value={3}>Anulação </MenuItem>
                      </Select>
                    </Box>
                  )
                }
                if (n == 'descricao') {
                  return (
                    <TextField
                      key={n}
                      fullWidth
                      id={n}
                      name={n}
                      multiline
                      rows={6}
                      label={getFieldLabel(n)}
                      value={formik.values[n]}
                      onChange={formik.handleChange}
                      error={formik.touched[n] && Boolean(formik.errors[n])}
                      helperText={formik.touched[n] && formik.errors[n]}
                    />
                  )
                }
                return (
                  <TextField
                    key={n}
                    fullWidth
                    id={n}
                    name={n}
                    label={getFieldLabel(n)}
                    value={formik.values[n]}
                    onChange={formik.handleChange}
                    error={formik.touched[n] && Boolean(formik.errors[n])}
                    helperText={formik.touched[n] && formik.errors[n]}
                  />
                )
              })
            }
            <LoadingButton
              color="primary"
              variant="contained"
              fullWidth
              type="submit"
              disabled={!currentPDF}
              loading={submitting}
            >
              Cadastrar
            </LoadingButton>
          </Box>
        </form>
      </Box>
    </Box>

  );
};