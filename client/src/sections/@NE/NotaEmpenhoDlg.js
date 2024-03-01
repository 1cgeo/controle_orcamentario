import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import AddNotaEmpenhoReader from './AddNotaEmpenhoReader';
import EditNotaEmepenhoReader from './EditNotaEmepenhoReader';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function NotaEmpenhoDlg({
    open,
    onClose,
    text,
    type,
    selectedCreditNote
}) {

    const getComponent = () => {
        return {
            'add': <AddNotaEmpenhoReader {...{ onClose }} />,
            'edit': <EditNotaEmepenhoReader {...{ onClose, selectedCreditNote }} />
        }[type]
    }

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
        >
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={onClose}
                        aria-label="close"
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        {text}
                    </Typography>
                </Toolbar>
            </AppBar>
            {getComponent()}

        </Dialog>
    );
}
