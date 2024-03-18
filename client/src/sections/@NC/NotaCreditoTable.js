import React from "react";
import { format } from 'date-fns'
import DeleteIcon from '@mui/icons-material/Delete';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { useSnackbar } from 'notistack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import IconButton from '@mui/material/IconButton';
import { MTableCell } from 'material-table';
import MaterialTable from '../../components/Table';
import CreditNoteDlg from './NotaCreditoDlg'
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { useAPI } from '../../contexts/apiContext'
import Tooltip from '@mui/material/Tooltip';
import EditNoteIcon from '@mui/icons-material/EditNote';

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

    const [tooltip, setTooltip] = React.useState(null)



    const handleClose = () => {
        onFetchData()
        setCreditNoteDlg({})
    }

    return (
        <>
            {/* {
                tooltip &&
                <div
                    style={{
                        border: '1px solid black',
                        backgroundColor: 'white',
                        zIndex: 100000000,
                        position: 'absolute',
                        top: coord.y,
                        left: coord.x,
                        maxWidth: ' 450px',
                        wordWrap: 'break-word',
                        fontWeight: 'bold'
                    }}>
                    {tooltip}
                </div>
            } */}

            <MaterialTable
                title='Notas de Crédito'
                loaded
                components={{
                    Cell: (props) => {
                        if (props.columnDef.title == 'Visualizar') {
                            return (
                                <MTableCell {...props} />
                            )
                        }
                        return (
                            <MTableCell
                                {...props}
                                onMouseEnter={(e) => {
                                    setTooltip(`${props.rowData.numero}:  ${props.rowData.descricao}`)
                                }}
                                onMouseOut={() => {
                                    setTooltip(null)
                                }}
                            />

                        )
                    }
                }}
                columns={[
                    {
                        title: 'Número', field: 'numero', render: rowData => (
                            <Tooltip title={tooltip}>
                                <span>{rowData.numero}</span>
                            </Tooltip >
                        )
                    },
                    {
                        title: 'Tipo', field: 'tipo_credito_nome', render: rowData => (
                            <Tooltip title={tooltip}>
                                <span>{rowData.tipo_credito_nome}</span>
                            </Tooltip >
                        )
                    },
                    {
                        title: 'Data', field: 'data', render: rowData => (
                            <Tooltip title={tooltip}>
                                <span>{format(new Date(rowData.data), "dd/MM/yy")}</span>
                            </Tooltip >
                        )
                    },
                    {
                        title: 'ND', field: 'nd', render: rowData => (
                            <Tooltip title={tooltip}>
                                <span>{rowData.nd}</span>
                            </Tooltip >
                        )
                    },
                    {
                        title: 'Valor', field: 'valor', render: rowData => (
                            <Tooltip title={tooltip}>
                                <span>{`R$ ${Number(rowData.valor).toFixed(2)}`}</span>
                            </Tooltip >
                        )
                    },
                    {
                        title: 'PI', field: 'pi', render: rowData => (
                            <Tooltip title={tooltip}>
                                <span>{rowData.pi}</span>
                            </Tooltip >
                        )
                    },
                    {
                        title: 'Opções', field: '', render: rowData => (
                            <>
                                <IconButton
                                    onClick={() => {
                                        setCreditNoteDlg({
                                            open: true,
                                            type: 'edit',
                                            text: 'Editar Nota de Crédito',
                                            selectedNC: rowData
                                        })
                                    }}
                                >
                                    <EditNoteIcon />
                                </IconButton>
                                <IconButton onClick={() => window.open(`/api/orcamentario/creditos/${rowData.id}/pdf`, '_blank').focus()}>
                                    <PictureAsPdfIcon />
                                </IconButton>
                            </>
                        )
                    }
                ]}
                data={creditNotes}
                actions={
                    [
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
                                    if (data?.error) {
                                        showSnackbar(data.error.response.data.message, 'error')
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
            < CreditNoteDlg
                {...{
                    open: !!(creditNoteDlg?.open && creditNoteDlg?.type == 'add'),
                    onClose: handleClose,
                    text: creditNoteDlg?.text,
                    type: creditNoteDlg?.type
                }
                }
            />
            < CreditNoteDlg
                {...{
                    open: !!(creditNoteDlg?.open && creditNoteDlg?.type == 'edit'),
                    onClose: handleClose,
                    text: creditNoteDlg?.text,
                    type: creditNoteDlg?.type,
                    selectedNC: creditNoteDlg?.selectedNC
                }
                }
            />
            < CreditNoteDlg
                {...{
                    open: !!(creditNoteDlg?.open && creditNoteDlg?.type == 'additional'),
                    onClose: handleClose,
                    text: creditNoteDlg?.text,
                    type: creditNoteDlg?.type,
                    selectedNC: selectedNCs[0]
                }
                }
            />
        </>
    )
}
