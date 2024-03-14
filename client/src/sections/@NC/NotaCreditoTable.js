import React from "react";
import { format } from 'date-fns'
import DeleteIcon from '@mui/icons-material/Delete';
import CreateIcon from '@mui/icons-material/Create';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { useSnackbar } from 'notistack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import IconButton from '@mui/material/IconButton';

import MaterialTable from '../../components/Table';
import CreditNoteDlg from './NotaCreditoDlg'
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { useAPI } from '../../contexts/apiContext'

export default function NotaCreditoTable({
    creditNotes,
    onFetchData
}) {


    const {
        deleteNotasCredito
    } = useAPI()

    const { enqueueSnackbar } = useSnackbar();

    const showSnackbar = (message, variant) => {
        // variant could be success, error, warning, info, or default
        enqueueSnackbar(message, { variant });
    };

    const [creditNoteDlg, setCreditNoteDlg] = React.useState({})
    const [hiddenCreateBtn, setHiddenCreateBtn] = React.useState(false)
    const [hiddenAdditionalBtn, setHiddenAdditionalBtn] = React.useState(true)
    const [selectedNCs, setSelectedNCs] = React.useState([])


    const handleClose = () => {
        onFetchData()
        setCreditNoteDlg({})
    }

    return (
        <>
            <MaterialTable
                title='Notas de Crédito'
                loaded
                columns={[
                    { title: 'Número', field: 'numero' },
                    { title: 'Tipo', field: 'tipo_credito_nome' },
                    { title: 'Data', field: 'data', render: rowData => format(new Date(rowData.data), "dd/MM/yy") },
                    { title: 'ND', field: 'nd' },
                    { title: 'Valor', field: 'valor', render: rowData => `R$ ${Number(rowData.valor).toFixed(2)}` },
                    { title: 'PI', field: 'pi' },
                    {
                        title: 'Visualizar', field: '', render: rowData => (
                            <IconButton onClick={() => window.open(`/api/orcamentario/creditos/${rowData.id}/pdf`, '_blank').focus()}>
                                <PictureAsPdfIcon />
                            </IconButton>
                        )
                    },
                ]}
                data={creditNotes}
                actions={[
                    // {
                    //     icon: CreateIcon,
                    //     tooltip: 'Editar',
                    //     hidden: hiddenCreateBtn,
                    //     onClick: () => setCreditNoteDlg({
                    //         open: true,
                    //         type: 'edit',
                    //         text: 'Editar Nota de Crédito',
                    //     })
                    // },
                    {
                        icon: DeleteIcon,
                        tooltip: 'Remover',
                        onClick: async () => {
                            try {
                                const data = await deleteNotasCredito(selectedNCs.map(i => i.id))
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
                        onClick: () => setCreditNoteDlg({
                            open: true,
                            type: 'add',
                            text: 'Cadastrar Nota de Crédito'
                        })
                    },
                    {
                        icon: NoteAddIcon,
                        tooltip: 'Complementar',
                        hidden: hiddenAdditionalBtn,
                        onClick: () => setCreditNoteDlg({
                            open: true,
                            type: 'additional',
                            text: 'Complementar Nota de Crédito'
                        })
                    }
                ]}
                options={{
                    selection: true
                }}
                onSelectionChange={(rows) => {
                    setSelectedNCs(rows)
                    if (rows.length > 1) {
                        setHiddenCreateBtn(true)
                        setHiddenAdditionalBtn(true)
                        return
                    }
                    setHiddenCreateBtn(false)
                    setHiddenAdditionalBtn(false)
                }}
            />
            <CreditNoteDlg
                {...{
                    open: !!(creditNoteDlg?.open && creditNoteDlg?.type == 'add'),
                    onClose: handleClose,
                    text: creditNoteDlg?.text,
                    type: creditNoteDlg?.type
                }}
            />
            <CreditNoteDlg
                {...{
                    open: !!(creditNoteDlg?.open && creditNoteDlg?.type == 'edit'),
                    onClose: handleClose,
                    text: creditNoteDlg?.text,
                    type: creditNoteDlg?.type,
                    selectedNC: selectedNCs[0]
                }}
            />
            <CreditNoteDlg
                {...{
                    open: !!(creditNoteDlg?.open && creditNoteDlg?.type == 'additional'),
                    onClose: handleClose,
                    text: creditNoteDlg?.text,
                    type: creditNoteDlg?.type,
                    selectedNC: selectedNCs[0]
                }}
            />
        </>
    )
}
