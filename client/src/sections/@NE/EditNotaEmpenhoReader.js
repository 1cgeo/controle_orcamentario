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
import { format } from 'date-fns'

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

import { useAPI } from '../../contexts/apiContext'

const pdfContentType = 'application/pdf';

const validationSchema = yup.object({
  nc: yup.string()
    .required('Preencha'),
  numero: yup.string()
    .required('Preencha'),
  data: yup.string()
    .required('Preencha'),
  descricao: yup.string()
    .required('Preencha'),
  cnpj_credor: yup.string()
    .required('Preencha'),
  nome_credor: yup.string()
    .required('Preencha'),
  quantidade: yup.string()
    .required('Preencha'),
  valor: yup.number()
    .required('Preencha')

});


export default function AddNotaEmpenhoReader({
  selectedNE,
  onClose
}) {

  const {
    getNotaEmpenho,
    updateNotaEmpenho
  } = useAPI()

  const { enqueueSnackbar } = useSnackbar();

  const showSnackbar = (message, variant) => {
    // variant could be success, error, warning, info, or default
    enqueueSnackbar(message, { variant });
  };

  const fetchData = async () => {
    const res = await getNotaEmpenho(selectedNE.id)
    formik.setFieldValue("data", format(new Date(res.dados[0].data), "dd/MM/yy"));
    formik.setFieldValue("numero", res.dados[0].numero);
    formik.setFieldValue("descricao", res.dados[0].descricao);
    formik.setFieldValue("nc", res.dados[0].nc);
    formik.setFieldValue("cnpj_credor", res.dados[0].cnpj_credor);
    formik.setFieldValue("nome_credor", res.dados[0].nome_credor);
    formik.setFieldValue("quantidade", res.dados[0].quantidade);
    formik.setFieldValue("valor", Number(res.dados[0].valor).toFixed(2));
  }

  const handleNE = async (values, { resetForm }) => {
    setSubmitting(true);
    try {
      const data = await updateNotaEmpenho(
        selectedNE.id,
        values
      )
      console.log(data)
      if (!data) {
        showSnackbar("Falha ao atualizar!", "error");
        return
      }
      showSnackbar("Atualizado com sucesso!", "success");
      onClose()
    } catch (error) {
      console.log(error)
      showSnackbar(error.message, 'error')
    } finally {
      setSubmitting(false);
    }
  }

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

  const getFieldLabel = (field) => {
    return {
      numero: "Número",
      data: "Data",
      descricao: "Descrição",
      cnpj_credor: "CNPJ",
      nome_credor: "Credor",
      valor: "Valor",
      quantidade: "Quantidade",
      nc: "Nota de Crédito"
    }[field]
  }

  const formik = useFormik({
    initialValues: {
      numero: '',
      data: '',
      descricao: '',
      cnpj_credor: '',
      nome_credor: '',
      valor: '',
      quantidade: '',
      nc: ''
    },
    validationSchema: validationSchema,
    onSubmit: handleNE
  });

  const extractTextPDF = () => {
    var pdf = pdfjsLib.getDocument(currentPDF);

    pdf.promise.then(async (pdf) => {
      let maxPages = pdf.numPages;
      let page = await pdf.getPage(1);
      let textContent = await page.getTextContent()
      let rows = textContent.items
      const ne = rows[26].str + rows[28].str + rows[30].str
      const data = format(new Date(rows[70].str), "dd/MM/yy")
      const valor = Number(rows[76].str.replace('.', '').replace(',', '.'))
      const cnpj = rows[77].str
      const nome = rows[79].str
      const nc = rows[81].str.split(' ').slice(-1)[0]

      page = await pdf.getPage(2);
      textContent = await page.getTextContent()
      rows = textContent.items
      let ignore = false
      const descricao = rows.filter((item, idx) => {
        if (idx > 22 && item.str == '') {
          ignore = true
        }
        if (ignore) return false
        if (idx > 22) return true
        return false
      }).map(i => i.str).join(' ')
      const quantidade = Number(rows[38].str.replace('.', '').replace(',', '.'))

      formik.setFieldValue("numero", ne)
      formik.setFieldValue("data", data)
      formik.setFieldValue("valor", valor)
      formik.setFieldValue("cnpj_credor", cnpj)
      formik.setFieldValue("nome_credor", nome)
      formik.setFieldValue("quantidade", quantidade)
      formik.setFieldValue("descricao", descricao)
      formik.setFieldValue("nc", nc)
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

  React.useEffect(() => {
    if (!selectedNE) return
    fetchData()
  }, [selectedNE])

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
                if (['valor', 'quantidade'].includes(n)) {
                  return (
                    <TextField
                      key={n}
                      fullWidth
                      id={n}
                      name={n}
                      label={getFieldLabel(n)}
                      value={formik.values[n]}
                      type="number"
                      onChange={formik.handleChange}
                      error={formik.touched[n] && Boolean(formik.errors[n])}
                      helperText={formik.touched[n] && formik.errors[n]}
                    />
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
              //disabled={!currentPDF}
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