import React from 'react';
import FromGroup from '../../components/FormGroup/FormGroup';
import PageWrapper from '../../components/PageWrapper/PageWrapper';
import Button from '../../components/Button/Button';
import ProfileForm from '../../components/ProfileForm';
import PartnesForm from '../../components/PartnesForm';
import {
  searchUser,
  addUserAsPartner,
  getPartners,
  removeUserAsPartner,
  getUserInfo,
  updateUser,
  uploadProfileImage,
  getProfileImage
} from '../../services/user';
import _get from 'lodash/get';
import { getAuth, getAuthDirectly } from '../../services/localStorage';
import {
  updateMessage,
  updateErrorMessage,
  updateMessageWithDelay
} from '../../redux/store/Feedback/feedback';
import { getRotas, deleteUser } from '../../services/data-de-entrega';
import { connect } from 'react-redux';
import { ADMIN } from '../../APP-CONFIG';

const partnersDefault = {
  isQuerying: false,
  isAdding: false,
  isRemoving: false,
  value: '',
  results: [],
  adds: []
};

const stateDefault = {
  image: null,
  fetchingImage: false,
  url: '',
  data: {
    queryUser: false,
    _id: '',
    nome: '',
    sobrenome: '',
    telefone: '',
    cidade: '',
    nascimento: '',
    numeroDeEmergencia: '',
    nomeDeEmergencia: '',
    rotaDefault: '',
    lider: false
  },
  isLoading: false,
  isEditing: false,
  partners: partnersDefault,
  rotas: []
};

class Profile extends React.Component {
  state = {
    ...stateDefault
  };

  componentDidMount = () => {
    this.fetchUserInfo();
    this.fetchPartners();
  };

  fetchUserInfo = () => {
    this.setState(
      { data: { ...this.state.data, queryUser: true } },
      async () => {
        try {
          const urlID = _get(this.props, 'match.params.id');
          const { _id } = await getAuth();
          const queryID = urlID || _id;
          const { user } = await getUserInfo(queryID);

          const { rotas } = await getRotas();
          this.setState(
            {
              fetchingImage: true,
              rotas,
              data: {
                ...this.state.data,
                ...user,
                queryUser: false
              }
            },
            this.fetchProfileImage
          );
        } catch (error) {}
      }
    );
  };

  fetchPartners = () => {
    this.setState(
      { partners: { ...this.state.partners, isQuerying: true } },
      async () => {
        try {
          const { _id } = await getAuth();
          const urlID = _get(this.props, 'match.params.id');
          const queryID = urlID || _id;
          const { partners } = await getPartners(queryID);
          this.setState({
            partners: {
              ...this.state.partners,
              adds: partners,
              isQuerying: false
            }
          });
        } catch (error) {}
      }
    );
  };

  onChangeHandler = ({ target: { name, value } }) => {
    this.setState({
      data: {
        ...this.state.data,
        [name]: value
      }
    });
  };

  fetchSearchUser = () => {
    this.setState(
      { partners: { ...this.state.partners, isQuerying: true } },
      async () => {
        try {
          const search = _get(this.state, 'partners.value');
          const { user } = await searchUser(search);
          this.setState({
            partners: {
              ...this.state.partners,
              results: user,
              isQuerying: false
            }
          });
        } catch (error) {}
      }
    );
  };

  onQueryPartners = ({ target: { value } }) => {
    this.setState(
      { partners: { ...this.state.partners, results: [], value } },
      () => {
        if (value.length > 4) {
          this.fetchSearchUser();
        }
      }
    );
  };

  addPartnerHandler = (partner_id, event) => {
    event.preventDefault();
    this.setState(
      {
        partners: { ...this.state.partners, isAdding: true }
      },
      async () => {
        try {
          const { _id } = await getAuth();
          const urlID = _get(this.props, 'match.params.id');
          const queryID = urlID || _id;
          const promises = [
            addUserAsPartner({
              _id: queryID,
              partner_id
            }),
            addUserAsPartner({
              _id: partner_id,
              partner_id: queryID
            })
          ];
          await Promise.all(promises);
          this.setState(
            { partners: partnersDefault, isEditing: false },
            this.fetchPartners
          );
          this.props.dispatch(updateMessage('Adicionado com sucesso.'));
        } catch (error) {}
      }
    );
  };

  removePartnerHandler = (idToRemove, event) => {
    event.preventDefault();
    this.setState(
      {
        partners: { ...this.state.partners, isRemoving: true }
      },
      async () => {
        try {
          const { _id } = await getAuth();
          const urlID = _get(this.props, 'match.params.id');
          const queryID = urlID || _id;
          const promises = [
            removeUserAsPartner({
              _id: queryID,
              idToRemove
            }),
            removeUserAsPartner({
              _id: idToRemove,
              idToRemove: queryID
            })
          ];
          await Promise.all(promises);
          this.setState({ partners: partnersDefault }, this.fetchPartners);
          this.props.dispatch(updateMessage('Removido com sucesso.'));
        } catch (error) {}
      }
    );
  };

  filterResultsToAdd = () => {
    const {
      partners: { results, adds }
    } = this.state;
    const userID = _get(this.state, 'data._id');
    return results.filter(({ _id }) => {
      let returned = true;
      adds.forEach(({ _id: add_id }) => {
        if (_id === add_id) {
          returned = false;
        }
      });
      if (_id === userID) {
        returned = false;
      }

      return returned;
    });
  };

  onUpdateUser = () => {
    this.setState(
      {
        isLoading: true
      },
      async () => {
        try {
          await updateUser({ ...this.state.data });
          this.setState({ isLoading: false, isEditing: false });
          this.props.dispatch(updateMessage('Perfil alterado com sucesso.'));
        } catch (error) {}
      }
    );
  };

  onEditHandler = () => {
    this.setState({
      isEditing: !this.state.isEditing
    });
  };

  onBackHandler = () => {
    this.props.history.goBack();
  };

  onChangeImageHandler = event => {
    let file = (event.target.files && event.target.files[0]) || false;
    if (!file) {
      return false;
    }
    const allowedExtenstions = ['png', 'jpg', 'jpeg'];
    let isAllowed = false;
    allowedExtenstions.forEach(ext => {
      if (file.type.includes(ext)) {
        isAllowed = true;
      }
    });
    if (!isAllowed) {
      this.props.dispatch(
        updateErrorMessage('Selecione um arquivo de imagem.')
      );
      return false;
    }
    this.setState(
      {
        image: file,
        fetchingImage: true
      },
      this.onUploadProfileImage
    );
  };

  onUploadProfileImage = async () => {
    try {
      const userID = _get(this.state, 'data._id');
      const { image } = this.state;
      await uploadProfileImage(image, userID);
      this.props.dispatch(updateMessage('Foto salva com sucesso.'));
      this.fetchProfileImage();
    } catch (error) {}
  };

  fetchProfileImage = async () => {
    try {
      const userID = _get(this.state, 'data._id');
      const { response } = await getProfileImage(userID);
      const base64Flag = 'data:image/jpeg;base64,';
      const withNoImage =
        'https://d2x5ku95bkycr3.cloudfront.net/App_Themes/Common/images/profile/0_200.png';
      this.setState({
        fetchingImage: false,
        url: response ? base64Flag + response : withNoImage
      });
    } catch (error) {}
  };

  onDeleteUserHandler = async () => {
    try {
      const _id = _get(this.props, 'match.params.id');
      await deleteUser({ _id });
      this.props.dispatch(
        updateMessageWithDelay('Usuário excluído com sucesso.')
      );
      this.props.history.goBack();
    } catch (error) {}
  };

  render() {
    const partnersToShow = this.filterResultsToAdd();
    const { url } = this.state;
    const urlID = _get(this.props, 'match.params.id');
    const { email } = getAuthDirectly();
    return (
      <PageWrapper title='Dados Pessoais'>
        <div className='m-bottom-40'>
          <div className='grid'>
            <div className='sm-4-12'>
              <FromGroup title='Foto de Perfil'>
                <div className='p-15 p-center'>
                  <p className='label d-block'>
                    Selecione a foto do seu perfil:
                  </p>
                  {url && (
                    <div className='m-bottom-20'>
                      <div
                        className='profile-image-background'
                        style={{ backgroundImage: `url(${url})` }}
                      >
                        <img src={url} alt='Foto do Usuário' />
                      </div>
                    </div>
                  )}
                  <div className='m-bottom-10'>
                    <label
                      htmlFor='profile-image'
                      className={`btn-primary btn d-block ${
                        this.state.fetchingImage ? 'disabled-link' : ''
                      } `}
                    >
                      Escolha uma foto de perfil
                      {this.state.fetchingImage && (
                        <i className='m-left-10 fas fa-sync rotate' />
                      )}
                      <input
                        id='profile-image'
                        className='d-none'
                        onChange={this.onChangeImageHandler}
                        type='file'
                      />
                    </label>
                  </div>
                </div>
              </FromGroup>
            </div>
          </div>
          <FromGroup title='Dados pessoais' formName='Dados do voluntário'>
            <ProfileForm
              {...this.state.data}
              rotas={this.state.rotas}
              isDisabled={this.state.isEditing}
              onChangeHandler={this.onChangeHandler}
              hideDetails={!ADMIN.includes(email)}
            />
          </FromGroup>
          <FromGroup title='Conjugue e familiares no GAS'>
            <PartnesForm
              {...this.state.partners}
              results={partnersToShow}
              isDisabled={this.state.isEditing}
              removePartner={this.removePartnerHandler}
              addPartner={this.addPartnerHandler}
              onChange={this.onQueryPartners}
            />
          </FromGroup>
          <div className='d-flex d-flex-space-between'>
            <div>
              {!this.state.isEditing ? (
                <div>
                  {urlID && (
                    <Button onClick={this.onBackHandler}>Voltar</Button>
                  )}
                  {(ADMIN.includes(email) || !urlID) && (
                    <Button onClick={this.onEditHandler} className='m-left-10'>
                      Editar
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <Button onClick={this.onUpdateUser} type='primary'>
                    Salvar alterações
                  </Button>
                  <Button onClick={this.onEditHandler} className='m-left-10'>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            {ADMIN.includes(email) && urlID && (
              <Button onClick={this.onDeleteUserHandler} type='danger'>
                Excluir usuário
              </Button>
            )}
          </div>
        </div>
      </PageWrapper>
    );
  }
}

export default connect()(Profile);
