import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import AddNotaCreditoReader from './AddNotaCreditoReader';
import AdditionalNotaCreditoReader from './AdditionalNotaCreditoReader';
import EditNotaCreditoReader from './EditNotaCreditoReader';

import { useAPI } from '../../contexts/apiContext'

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function CreditNoteDlg({
    open,
    onClose,
    text,
    type,
    selectedNC
}) {

    const getComponent = () => {
        return {
            'additional': <AdditionalNotaCreditoReader {...{ onClose, selectedNC }} />,
            'add': <AddNotaCreditoReader {...{ onClose }} />,
            'edit': <EditNotaCreditoReader {...{ onClose, selectedNC }} />
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
