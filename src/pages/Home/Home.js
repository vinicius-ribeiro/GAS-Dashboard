import React from 'react';
import FromGroup from '../../components/FormGroup/FormGroup';
import PageWrapper from '../../components/PageWrapper/PageWrapper';
import Button from '../../components/Button/Button';
import { NavLink } from 'react-router-dom';
import ProfileForm from '../../components/ProfileForm';
import ActionInfo from '../../components/ActionInfo/ActionInfo';
import { getAuth, getAuthDirectly } from '../../services/localStorage';
import { getUserInfo } from '../../services/user';
import { getNextActionDate } from '../../services/data-de-entrega';
import _get from 'lodash/get';
import moment from 'moment';
import WithLoading from './../../utils/WithLoading';
import {
  registerVoluntary,
  updateVoluntary,
  isRegistered,
  deleteVoluntary,
  voluntaryHistory
} from '../../services/voluntary';
import { updateMessage } from '../../redux/store/Feedback/feedback';
import { ADMIN } from '../../APP-CONFIG';

const stateDefault = {
  data: {
    _id: '',
    nome: '',
    sobrenome: '',
    telefone: '',
    cidade: '',
    nascimento: '',
    numeroDeEmergencia: '',
    nomeDeEmergencia: ''
  },
  partners: [],
  action: {
    carModel: '',
    withCar: true,
    first_time: false,
    _id: ''
  },
  details: {
    isEditing: false,
    hasHistory: false,
    isFetching: true,
    hasActionSchedule: false,
    senha: '',
    _id: '',
    dataProxima: '',
    noHasDate: false
  }
};

class Home extends React.Component {
  state = {
    ...stateDefault
  };

  componentDidMount = () => {
    this.fetchUserInfo();
  };

  fetchUserInfo = async () => {
    try {
      const { _id } = await getAuth();
      const { user } = await getUserInfo(_id);
      this.setState(
        {
          data: {
            ...this.state.data,
            ...user
          }
        },
        this.fetchAllData
      );
    } catch (error) {}
  };

  fetchAllData = () => {
    this.fetchNextDateAvaliable();
    this.queryVoluntaryHistory();
  };

  queryVoluntaryHistory = async () => {
    try {
      const user_id = _get(this.state, 'data._id');
      const { hasHistory } = await voluntaryHistory({ user_id });
      this.setState({
        details: {
          ...this.state.details,
          hasHistory
        },
        action: {
          ...this.state.action,
          first_time: hasHistory
        }
      });
    } catch (error) {}
  };

  queryPartnersInAction = async () => {
    const action_id = _get(this.state, 'details._id');
    const parceiro_1 = _get(this.state, 'data.parceiro_1');
    const parceiro_2 = _get(this.state, 'data.parceiro_2');
    try {
      const partners = [];
      const promises = [
        await isRegistered({
          action_id,
          user_id: parceiro_1
        }),
        await isRegistered({
          action_id,
          user_id: parceiro_2
        })
      ];

      const [partner_1, partner_2] = await Promise.all(promises);
      const partner_name_1 = _get(partner_1, 'voluntary.nome');
      const partner_name_2 = _get(partner_2, 'voluntary.nome');
      partner_name_1 && partners.push(partner_name_1);
      partner_name_2 && partners.push(partner_name_2);
      this.setState({
        partners
      });
    } catch (error) {}
  };

  isAlreadyRegistered = async () => {
    const action_id = _get(this.state, 'details._id');
    const user_id = _get(this.state, 'data._id');
    try {
      const { voluntary } = await isRegistered({
        action_id,
        user_id
      });
      const isEditing = _get(voluntary, '_id');
      this.setState(
        {
          action: {
            ...this.state.action,
            ...voluntary
          },
          details: {
            ...this.state.details,
            isEditing: !!isEditing
          }
        },
        this.queryPartnersInAction
      );
    } catch (error) {}
  };

  fetchNextDateAvaliable = async () => {
    try {
      const date = await getNextActionDate();
      const hasActionSchedule = _get(date, 'dataProxima');
      this.setState(
        {
          details: {
            ...this.state.details,
            isFetching: false,
            hasActionSchedule: !!hasActionSchedule,
            ...date
          }
        },
        this.isAlreadyRegistered
      );
    } catch (error) {
      this.setState({
        isFetching: false,
        noHasDate: true
      });
    }
  };

  onChangeHandler = ({ target: { name, value } }) => {
    this.setState({
      data: {
        ...this.state.data,
        [name]: value
      }
    });
  };

  onChangeActionHandler = ({ target: { name, value } }, reset = {}) => {
    this.setState({
      action: {
        ...this.state.action,
        [name]: value,
        ...reset
      }
    });
  };

  onQueryPartners = ({ target: { value } }) => {
    this.setState({ partners: { ...this.state.partners, value } });
  };

  onSubmitSubscribe = () => async done => {
    try {
      const action_date = _get(this.state, 'details.dataProxima');
      const action_id = _get(this.state, 'details._id');
      const user_id = _get(this.state, 'data._id');
      const nome = _get(this.state, 'data.nome');
      const first_time = _get(this.state, 'action.first_time');
      const withCar = _get(this.state, 'action.withCar');
      const carModel = _get(this.state, 'action.carModel');
      const _id = _get(this.state, 'action._id');

      const fn = _id ? updateVoluntary : registerVoluntary;

      await fn({
        params: {
          _id,
          first_time,
          carModel,
          withCar,
          action_date,
          action_id,
          user_id,
          nome
        }
      });
      done();
      const message = _id ? 'Atualizado' : 'Cadastro feito';
      this.props.dispatch(updateMessage(`${message} com sucesso.`));
      this.fetchAllData();
    } catch (error) {
      done();
    }
  };

  onDeleteSubscribe = () => async done => {
    try {
      const _id = _get(this.state, 'action._id');
      await deleteVoluntary({ _id });
      this.setState({
        action: {
          ...stateDefault.action
        }
      });
      done();
      this.props.dispatch(updateMessage('Cadastro excluído.'));
      this.fetchAllData();
    } catch (error) {}
  };

  isValidRegister = () => {
    const { carModel, withCar } = _get(this.state, 'action', {});
    return withCar ? carModel : true;
  };

  openEdition = () => {
    this.setState(
      {
        details: {
          ...this.state.details,
          isEditing: !this.state.details.isEditing
        }
      },
      () => {
        const isCancelled = this.state.details.isEditing;
        isCancelled && this.isAlreadyRegistered();
      }
    );
  };

  render() {
    const { email } = getAuthDirectly();
    const dataProxima = _get(this.state, 'details.dataProxima');
    const parceiro_1 = _get(this.state, 'data.parceiro_1');
    const parceiro_2 = _get(this.state, 'data.parceiro_2');
    const isValidRegister = this.isValidRegister();
    return (
      <PageWrapper
        title='Voluntariar-se'
        loading={this.state.details.isFetching}
      >
        {dataProxima && (
          <h2 className='fw-300 color-theme m-bottom-30'>
            Data da próxima entrega:{' '}
            <span className='fw-bold_ d-block fs-3'>
              {moment(dataProxima).format('DD/MM/YYYY')}
            </span>
          </h2>
        )}

        {!this.state.details.hasActionSchedule && (
          <p className='color-dark m-bottom-20 p-center'>
            Ainda não temos uma entrega prevista.
          </p>
        )}

        {this.state.action._id && this.state.details.isOpen && (
          <div className='m-bottom-20 background-success color-white p-center p-10'>
            Você já está cadastrado na próxima entrega.
          </div>
        )}

        {!this.state.details.isOpen && (
          <p className='color-dark m-bottom-20 p-center'>
            A chamada ainda não está aberta p/ próxima entrega.
          </p>
        )}

        {!this.state.action._id &&
          this.state.details.hasActionSchedule &&
          this.state.details.isOpen && (
            <p className='color-dark m-bottom-20 p-center'>
              Você ainda não está inscrito na próxima entrega, gostaria de
              participar?
            </p>
          )}

        {this.state.details.hasActionSchedule && this.state.details.isOpen && (
          <div className='m-bottom-40'>
            <FromGroup
              title='Confirme seus dados pessoais'
              formName='Dados do voluntário'
            >
              <ActionInfo
                disabled={this.state.details.isEditing}
                {...this.state.action}
                hideFirstTime={this.state.details.hasHistory}
                onChangeHandler={this.onChangeActionHandler}
              />
            </FromGroup>
            <FromGroup
              title='Confirme seus dados pessoais'
              formName='Dados do voluntário'
            >
              <ProfileForm
                {...this.state.data}
                disabledAll
                hideDetails
                isAdmin={ADMIN.includes(email)}
                onChangeHandler={this.onChangeHandler}
              />
            </FromGroup>

            {(parceiro_1 || parceiro_2) && (
              <FromGroup title='Parceiros' formName='Parceiros cadastrados'>
                <div className='p-15'>
                  {this.state.partners.length === 0 && (
                    <p className='color-dark'>
                      Seus familiares cadastrados ainda não se inscreveram para
                      essa entrega.
                    </p>
                  )}

                  {this.state.partners.length === 1 && (
                    <p className='color-dark'>
                      Dos seus familiares cadastrados,{' '}
                      <strong>{this.state.partners[0]}</strong> já se inscreveu
                      nessa entrega e vocês devem ir juntos.
                    </p>
                  )}

                  {this.state.partners.length > 1 && (
                    <p className='color-dark'>
                      Dos seus familiares cadastradosss,{' '}
                      <strong>{this.state.partners[0]}</strong>e{' '}
                      <strong>{this.state.partners[1]}</strong> já se
                      inscreveram nessa entrega e vocês devem ir juntos.
                    </p>
                  )}
                </div>
              </FromGroup>
            )}

            <div className='d-flex d-flex-space-between'>
              <div>
                {!this.state.action._id ? (
                  <Button
                    disabled={!isValidRegister}
                    loading={this.props.onSubmitSubscribe.isLoading ? 1 : 0}
                    onClick={this.props.onSubmitSubscribe.fn}
                    type='primary'
                  >
                    Salvar Cadastro
                  </Button>
                ) : (
                  <div>
                    {this.state.details.isEditing ? (
                      <div>
                        <Button
                          className='m-right-10'
                          onClick={this.openEdition}
                        >
                          Editar Cadastro
                        </Button>
                        <Button
                          loading={
                            this.props.onDeleteSubscribe.isLoading ? 1 : 0
                          }
                          onClick={this.props.onDeleteSubscribe.fn}
                          type='danger'
                        >
                          Excluir Cadastro
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Button
                          className='m-right-10'
                          onClick={this.openEdition}
                        >
                          Cancelar
                        </Button>
                        <Button
                          disabled={!isValidRegister}
                          loading={
                            this.props.onDeleteSubscribe.isLoading ? 1 : 0
                          }
                          onClick={this.props.onSubmitSubscribe.fn}
                          type='primary'
                        >
                          Atualizar Cadastro
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <NavLink to='/meu-perfil'>
                <Button>Editar Perfil</Button>
              </NavLink>
            </div>
          </div>
        )}
      </PageWrapper>
    );
  }
}

export default WithLoading({
  onSubmitSubscribe: 'onSubmitSubscribe',
  onDeleteSubscribe: 'onDeleteSubscribe'
})(Home);
