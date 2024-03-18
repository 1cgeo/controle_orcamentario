import React from "react";
import { format } from 'date-fns'
import DeleteIcon from '@mui/icons-material/Delete';
import CreateIcon from '@mui/icons-material/Create';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { useSnackbar } from 'notistack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import IconButton from '@mui/material/IconButton';

import MaterialTable from '../../components/Table';
import NotaEmpenhoDlg from './NotaEmpenhoDlg'
import { useAPI } from '../../contexts/apiContext'
import EditNoteIcon from '@mui/icons-material/EditNote';

export default function NotaEmpenhoTable({
    empenhos,
    onFetchData
}) {


    const {
        deleteNotasEmpenho
    } = useAPI()

    const { enqueueSnackbar } = useSnackbar();

    const showSnackbar = (message, variant) => {
        // variant could be success, error, warning, info, or default
        enqueueSnackbar(message, { variant });
    };

    const [neDlg, setNEDlg] = React.useState({})
    const [hiddenCreateBtn, setHiddenCreateBtn] = React.useState(false)
    const [hiddenAdditionalBtn, setHiddenAdditionalBtn] = React.useState(true)
    const [selectedCreditNotes, setSelectedCreditNotes] = React.useState([])


    const handleClose = () => {
        onFetchData()
        setNEDlg({})
    }

    return (
        <>
            <MaterialTable
                title='Notas de Empenho'
                loaded
                columns={[
                    { title: 'Número', field: 'numero' },
                    { title: 'Tipo', field: 'tipo_empenho_nome' },
                    { title: 'Data', field: 'data', render: rowData => format(new Date(rowData.data), "dd/MM/yy") },
                    { title: 'Valor', field: 'valor', render: rowData => `R$ ${Number(rowData.valor).toFixed(2)}` },
                    { title: 'CNPJ', field: 'cnpj_credor' },
                    { title: 'Credor', field: 'nome_credor' },
                    {
                        title: 'Visualizar', field: '', render: rowData => (
                            <>
                                <IconButton
                                    onClick={() => {
                                        setNEDlg({
                                            open: true,
                                            type: 'edit',
                                            text: 'Editar Nota de Empenho',
                                            selectedNE: rowData
                                        })
                                    }}
                                >
                                    <EditNoteIcon />
                                </IconButton>
                                <IconButton onClick={() => window.open(`/api/orcamentario/empenhos/${rowData.id}/pdf`, '_blank').focus()}>
                                    <PictureAsPdfIcon />
                                </IconButton>
                            </>
                        )
                    },
                ]}
                data={empenhos}
                actions={[
                    {
                        icon: DeleteIcon,
                        tooltip: 'Remover',
                        onClick: async () => {
                            try {
                                const data = await deleteNotasEmpenho(selectedCreditNotes.map(i => i.id))
                                if (!data) {
                                    showSnackbar("Falha ao Remover!", "error");
                                    return
                                }
                                showSnackbar("Removido com sucesso.", "success");
                                onFetchData()
                            } catch (error) {
                                console.log(error)
                                showSnackbar(error.message, 'error')
                            }
                        }
                    },
                    {
                        icon: LibraryAddIcon,
                        tooltip: "Adicionar",
                        isFreeAction: true,
                        onClick: () => setNEDlg({
                            open: true,
                            type: 'add',
                            text: 'Cadastrar Nota de Empenho'
                        })
                    }
                ]}
                options={{
                    selection: true
                }}
                onSelectionChange={(rows) => {
                    setSelectedCreditNotes(rows)
                    if (rows.length > 1) {
                        setHiddenCreateBtn(true)
                        setHiddenAdditionalBtn(true)
                        return
                    }
                    setHiddenCreateBtn(false)
                    setHiddenAdditionalBtn(false)
                }}
            />
            <NotaEmpenhoDlg
                {...{
                    open: !!(neDlg?.open && neDlg?.type == 'add'),
                    onClose: handleClose,
                    text: neDlg?.text,
                    type: neDlg?.type
                }}
            />
            <NotaEmpenhoDlg
                {...{
                    open: !!(neDlg?.open && neDlg?.type == 'edit'),
                    onClose: handleClose,
                    text: neDlg?.text,
                    type: neDlg?.type,
                    selectedNE: neDlg?.selectedNE
                }}
            />
        </>
    )
}
